import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AlarmStatus, AttemptStatus, ChargeType } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ProgressService } from '../progress/progress.service';
import { ChargesService } from '../charges/charges.service';
import { VisionService } from '../vision/vision.service';
import { getItem, pickRandomItem } from '../vision/item-catalog';
import { CreateAlarmDto } from './dto/create-alarm.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { ValidateChallengeDto } from './dto/validate-challenge.dto';
import { SkipItemDto } from './dto/skip-item.dto';
import { DIFFICULTY_PRESETS, SKIP_PRICE_USD } from './alarms.constants';

@Injectable()
export class AlarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly progress: ProgressService,
    private readonly charges: ChargesService,
    private readonly vision: VisionService,
  ) {}

  async create(userId: string, dto: CreateAlarmDto) {
    const difficulty = dto.challengeDifficulty ?? 'EASY';
    const preset = DIFFICULTY_PRESETS[difficulty];
    const item = dto.itemType ? getItem(dto.itemType) ?? pickRandomItem() : pickRandomItem();

    const alarm = await this.prisma.alarm.create({
      data: {
        userId,
        title: dto.title,
        scheduledAt: new Date(dto.scheduledAt),
        repeatPattern: dto.repeatPattern ?? 'NONE',
        timezone: dto.timezone,
        locale: dto.locale ?? 'en-US',
        soundId: dto.soundId,
        snoozeEnabled: dto.snoozeEnabled ?? true,
        snoozeMinutes: dto.snoozeMinutes ?? 5,
        challengeMode: dto.challengeMode ?? true,
        challengeDifficulty: difficulty,
        challenge: dto.challengeMode === false ? undefined : {
          create: {
            itemType: item.itemType,
            itemLabel: item.label[dto.locale ?? 'en-US'] ?? item.label['en-US'],
            itemSource: 'CATALOG',
            validationType: 'ON_DEVICE',
            skipPrice: SKIP_PRICE_USD,
            isRequired: true,
            validationTimeoutSeconds: preset.validationTimeoutSeconds,
            confidenceThreshold: preset.confidenceThreshold,
          },
        },
      },
      include: { challenge: true },
    });

    await this.auditLog.record({
      userId,
      eventType: 'alarm.created',
      entityType: 'alarm',
      entityId: alarm.id,
    });

    return alarm;
  }

  list(userId: string) {
    return this.prisma.alarm.findMany({
      where: { userId, status: { not: AlarmStatus.DELETED } },
      include: { challenge: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  get(userId: string, alarmId: string) {
    return this.findOwned(userId, alarmId);
  }

  private async findOwned(userId: string, alarmId: string) {
    const alarm = await this.prisma.alarm.findUnique({
      where: { id: alarmId },
      include: { challenge: true },
    });
    if (!alarm || alarm.status === AlarmStatus.DELETED) {
      throw new NotFoundException('Alarm not found');
    }
    if (alarm.userId !== userId) {
      throw new ForbiddenException('Alarm does not belong to this user');
    }
    return alarm;
  }

  async update(userId: string, alarmId: string, dto: UpdateAlarmDto) {
    await this.findOwned(userId, alarmId);
    return this.prisma.alarm.update({
      where: { id: alarmId },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: { challenge: true },
    });
  }

  async remove(userId: string, alarmId: string) {
    await this.findOwned(userId, alarmId);
    await this.prisma.alarm.update({ where: { id: alarmId }, data: { status: AlarmStatus.DELETED } });
    await this.auditLog.record({
      userId,
      eventType: 'alarm.deleted',
      entityType: 'alarm',
      entityId: alarmId,
    });
    return { id: alarmId, status: AlarmStatus.DELETED };
  }

  async trigger(userId: string, alarmId: string) {
    const alarm = await this.findOwned(userId, alarmId);

    const attempt = await this.prisma.challengeAttempt.create({
      data: { alarmId, userId, status: AttemptStatus.IN_PROGRESS },
    });

    return {
      attemptId: attempt.id,
      challenge: alarm.challenge,
      hasFreeSkipAvailable: await this.progress.hasUsableFreeSkip(userId),
    };
  }

  async validate(userId: string, alarmId: string, dto: ValidateChallengeDto) {
    const alarm = await this.findOwned(userId, alarmId);
    if (!alarm.challenge) {
      throw new BadRequestException('This alarm has no active challenge');
    }

    const attempt = await this.getOpenAttempt(userId, alarmId, dto.attemptId);

    const elapsedSeconds = (Date.now() - attempt.startedAt.getTime()) / 1000;
    if (elapsedSeconds > alarm.challenge.validationTimeoutSeconds) {
      await this.prisma.challengeAttempt.update({
        where: { id: attempt.id },
        data: { status: AttemptStatus.EXPIRED },
      });
      throw new BadRequestException('Validation window expired; trigger a new attempt');
    }

    const result = await this.vision.validate(alarm.challenge.itemType, alarm.challenge.confidenceThreshold, {
      detectedLabel: dto.detectedLabel,
      confidence: dto.confidence,
      boundingBoxAreaRatio: dto.boundingBoxAreaRatio,
      frameBase64: dto.frameBase64,
    });

    if (!result.isMatch) {
      return { success: false, reason: result.reason ?? 'no_match', attemptId: attempt.id };
    }

    await this.prisma.challengeAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.COMPLETED,
        completedAt: new Date(),
        validationScore: result.confidence,
        metadataJson: { source: result.source },
      },
    });

    const progress = await this.progress.recordCompletion({
      userId,
      usedSkip: false,
      validationSeconds: elapsedSeconds,
    });

    await this.auditLog.record({
      userId,
      eventType: 'alarm.validated',
      entityType: 'challenge_attempt',
      entityId: attempt.id,
      payload: { confidence: result.confidence, source: result.source },
    });

    return { success: true, attemptId: attempt.id, progress };
  }

  async skipItem(userId: string, alarmId: string, dto: SkipItemDto) {
    const alarm = await this.findOwned(userId, alarmId);
    if (!alarm.challenge) {
      throw new BadRequestException('This alarm has no active challenge');
    }

    const attempt = await this.getOpenAttempt(userId, alarmId, dto.attemptId);
    const consumeFreeSkip = await this.progress.hasUsableFreeSkip(userId);

    if (!consumeFreeSkip) {
      await this.charges.chargeNow({
        userId,
        chargeType: ChargeType.CHALLENGE_SKIP,
        amount: Number(alarm.challenge.skipPrice),
        metadata: { alarmId, attemptId: attempt.id },
      });
    }

    await this.prisma.challengeAttempt.update({
      where: { id: attempt.id },
      data: { status: AttemptStatus.SKIPPED, skippedAt: new Date() },
    });

    const progress = await this.progress.recordSkip(userId, consumeFreeSkip);

    await this.auditLog.record({
      userId,
      eventType: consumeFreeSkip ? 'alarm.skipped_free' : 'alarm.skipped_paid',
      entityType: 'challenge_attempt',
      entityId: attempt.id,
    });

    return { attemptId: attempt.id, chargedFreeSkip: consumeFreeSkip, progress };
  }

  private async getOpenAttempt(userId: string, alarmId: string, attemptId: string) {
    const attempt = await this.prisma.challengeAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.alarmId !== alarmId || attempt.userId !== userId) {
      throw new NotFoundException('Challenge attempt not found');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(`Attempt already resolved as ${attempt.status}`);
    }
    return attempt;
  }
}
