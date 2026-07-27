import { Injectable } from '@nestjs/common';
import { ChargeStatus, ChargeType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

export interface CreateChargeInput {
  userId: string;
  subscriptionId?: string;
  chargeType: ChargeType;
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ChargesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a charge and immediately marks it paid.
   * In production this defers to the PSP (Stripe/Apple/Google) webhook
   * before flipping status — stubbed here since no PSP is wired up yet.
   */
  async chargeNow(input: CreateChargeInput) {
    return this.prisma.charge.create({
      data: {
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        chargeType: input.chargeType,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        status: ChargeStatus.PAID,
        dueAt: new Date(),
        paidAt: new Date(),
        metadataJson: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  list(userId: string) {
    return this.prisma.charge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
