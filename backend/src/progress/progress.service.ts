import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  XP_COMPLETION,
  XP_COMPLETION_WITHOUT_SKIP,
  XP_BONUS_STREAK_3,
  XP_BONUS_STREAK_5,
  XP_SHARE_ACHIEVEMENT,
  XP_FAST_VALIDATION_BONUS,
  FAST_VALIDATION_THRESHOLD_SECONDS,
  FREE_SKIP_STREAK_INTERVAL,
  FREE_SKIP_MAX_BALANCE,
  FREE_SKIP_EXPIRY_DAYS,
  levelFromXp,
} from './progress.constants';

export interface RecordCompletionInput {
  userId: string;
  usedSkip: boolean;
  validationSeconds?: number;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  get(userId: string) {
    return this.prisma.userProgress.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async recordCompletion(input: RecordCompletionInput) {
    const progress = await this.get(input.userId);

    let xpGain = input.usedSkip ? XP_COMPLETION : XP_COMPLETION_WITHOUT_SKIP;

    const consecutiveCompletions = progress.consecutiveCompletions + 1;
    if (consecutiveCompletions % 5 === 0) {
      xpGain += XP_BONUS_STREAK_5;
    } else if (consecutiveCompletions % 3 === 0) {
      xpGain += XP_BONUS_STREAK_3;
    }

    if (
      input.validationSeconds !== undefined &&
      input.validationSeconds <= FAST_VALIDATION_THRESHOLD_SECONDS
    ) {
      xpGain += XP_FAST_VALIDATION_BONUS;
    }

    const xpTotal = progress.xpTotal + xpGain;

    // Free-skip reward: earned every N consecutive completions, capped
    // non-cumulatively, and stamped with a fresh expiry each time it is (re)earned.
    let freeSkipBalance = progress.freeSkipBalance;
    let freeSkipExpiresAt = progress.freeSkipExpiresAt;
    if (consecutiveCompletions % FREE_SKIP_STREAK_INTERVAL === 0) {
      freeSkipBalance = Math.min(freeSkipBalance + 1, FREE_SKIP_MAX_BALANCE);
      freeSkipExpiresAt = new Date(Date.now() + FREE_SKIP_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    }

    return this.prisma.userProgress.update({
      where: { userId: input.userId },
      data: {
        xpTotal,
        level: levelFromXp(xpTotal),
        consecutiveCompletions,
        totalCompletions: progress.totalCompletions + 1,
        bestStreak: Math.max(progress.bestStreak, consecutiveCompletions),
        freeSkipBalance,
        freeSkipExpiresAt,
      },
    });
  }

  async recordSkip(userId: string, consumedFreeSkip: boolean) {
    const progress = await this.get(userId);
    return this.prisma.userProgress.update({
      where: { userId },
      data: {
        consecutiveCompletions: 0,
        totalSkips: progress.totalSkips + 1,
        freeSkipBalance: consumedFreeSkip
          ? Math.max(progress.freeSkipBalance - 1, 0)
          : progress.freeSkipBalance,
      },
    });
  }

  /** A free skip is usable only if the balance is positive and not expired. */
  async hasUsableFreeSkip(userId: string): Promise<boolean> {
    const progress = await this.get(userId);
    if (progress.freeSkipBalance <= 0) return false;
    if (progress.freeSkipExpiresAt && progress.freeSkipExpiresAt < new Date()) {
      await this.prisma.userProgress.update({
        where: { userId },
        data: { freeSkipBalance: 0, freeSkipExpiresAt: null },
      });
      return false;
    }
    return true;
  }

  async awardShareXp(userId: string) {
    const progress = await this.get(userId);
    const xpTotal = progress.xpTotal + XP_SHARE_ACHIEVEMENT;
    return this.prisma.userProgress.update({
      where: { userId },
      data: { xpTotal, level: levelFromXp(xpTotal) },
    });
  }
}
