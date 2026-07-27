import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true, progress: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const settings = await this.prisma.userSettings.update({
      where: { userId },
      data: dto,
    });
    await this.auditLog.record({
      userId,
      eventType: 'settings.updated',
      entityType: 'user_settings',
      entityId: settings.id,
      payload: { ...dto },
    });
    return settings;
  }

  async deleteAccount(userId: string) {
    // LGPD: soft-delete + scrub PII, keep financial records for legal retention.
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        name: 'Deleted user',
        email: `deleted-${userId}@alarmlock.invalid`,
        phone: null,
      },
    });
    await this.auditLog.record({
      userId,
      eventType: 'account.deleted',
      entityType: 'user',
      entityId: userId,
    });
    return { id: user.id, deletedAt: user.deletedAt };
  }
}
