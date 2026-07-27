import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { AuditLogService } from '../common/audit-log.service';
import { RenderShareDto } from './dto/render-share.dto';

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly auditLog: AuditLogService,
  ) {}

  async render(userId: string, dto: RenderShareDto) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });

    // LGPD: server-side opt-in enforcement regardless of what the client requests.
    const includeLocation = Boolean(dto.includeLocation) && Boolean(settings?.enableLocationShare);
    const includeWeather = Boolean(dto.includeWeather) && Boolean(settings?.enableWeatherShare);
    const includeTime = dto.includeTime ?? settings?.enableTimeShare ?? true;

    const post = await this.prisma.socialSharePost.create({
      data: {
        userId,
        alarmId: dto.alarmId,
        templateCode: dto.templateCode,
        includeWeather,
        includeLocation,
        includeTime,
        watermarkText: settings?.enableWatermark === false ? null : dto.watermarkText ?? 'AlarmLock Premium',
        // Rendering itself is delegated to an async worker (section 13.2);
        // this path just reserves the record and returns its id for polling.
        imagePath: null,
      },
    });

    await this.progress.awardShareXp(userId);
    await this.auditLog.record({
      userId,
      eventType: 'share.rendered',
      entityType: 'social_share_post',
      entityId: post.id,
    });

    return post;
  }
}
