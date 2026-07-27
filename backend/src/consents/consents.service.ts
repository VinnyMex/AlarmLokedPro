import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateConsentDto } from './dto/create-consent.dto';

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async grant(userId: string, dto: CreateConsentDto) {
    const consent = await this.prisma.consent.create({
      data: {
        userId,
        consentType: dto.consentType,
        version: dto.version,
        source: dto.source,
        grantedAt: new Date(),
      },
    });
    await this.auditLog.record({
      userId,
      eventType: 'consent.granted',
      entityType: 'consent',
      entityId: consent.id,
      payload: { consentType: dto.consentType, version: dto.version },
    });
    return consent;
  }

  list(userId: string) {
    return this.prisma.consent.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
