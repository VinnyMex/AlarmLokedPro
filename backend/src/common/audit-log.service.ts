import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

interface RecordAuditLogInput {
  userId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  deviceId?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: RecordAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        ipAddress: input.ipAddress,
        deviceId: input.deviceId,
        payloadJson: input.payload as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
