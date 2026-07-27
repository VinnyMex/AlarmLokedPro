import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ChargesService } from '../charges/charges.service';
import { AuditLogService } from '../common/audit-log.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { PLAN_CODE_PREMIUM_MONTHLY, PRICE_MONTHLY_USD, TRIAL_DAYS } from './subscriptions.constants';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly charges: ChargesService,
    private readonly auditLog: AuditLogService,
  ) {}

  async status(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return subscription ?? { status: 'NONE' as const };
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    const alreadyUsedTrial = await this.prisma.subscription.findFirst({
      where: { userId, trialStartAt: { not: null } },
    });

    const now = new Date();
    const usesTrial = !alreadyUsedTrial;
    const trialStartAt = usesTrial ? now : null;
    const trialEndAt = usesTrial ? new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : null;

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planCode: PLAN_CODE_PREMIUM_MONTHLY,
        status: usesTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        priceMonthly: PRICE_MONTHLY_USD,
        currency: 'USD',
        trialStartAt,
        trialEndAt,
        currentPeriodStart: usesTrial ? trialStartAt : now,
        currentPeriodEnd: usesTrial
          ? trialEndAt
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        provider: dto.provider,
      },
    });

    await this.prisma.paymentMethod.create({
      data: {
        userId,
        brand: 'card',
        last4: '0000',
        expMonth: 12,
        expYear: now.getFullYear() + 3,
        tokenRef: dto.paymentMethodToken,
        isDefault: true,
      },
    });

    if (!usesTrial) {
      await this.charges.chargeNow({
        userId,
        subscriptionId: subscription.id,
        chargeType: ChargeType.SUBSCRIPTION,
        amount: PRICE_MONTHLY_USD,
        metadata: { reason: 'subscription_activation' },
      });
    }

    await this.auditLog.record({
      userId,
      eventType: usesTrial ? 'subscription.trial_started' : 'subscription.activated',
      entityType: 'subscription',
      entityId: subscription.id,
    });

    return subscription;
  }

  async cancel(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: [SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }
    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription already scheduled for cancellation');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true, autoRenew: false },
    });

    await this.auditLog.record({
      userId,
      eventType: 'subscription.cancel_scheduled',
      entityType: 'subscription',
      entityId: subscription.id,
    });

    return updated;
  }

  /** Renews a subscription's billing period and charges the recurring fee. */
  async renew(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
    });

    if (subscription.cancelAtPeriodEnd) {
      return this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.CANCELED },
      });
    }

    const periodStart = subscription.currentPeriodEnd ?? new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.charges.chargeNow({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      chargeType: ChargeType.SUBSCRIPTION,
      amount: Number(subscription.priceMonthly),
      metadata: { reason: 'subscription_renewal' },
    });

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }
}
