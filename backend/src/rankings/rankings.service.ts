import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PeriodType } from '@prisma/client';

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday as first day
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(periodType: PeriodType, userId?: string) {
    const now = new Date();
    const periodStart = periodType === 'WEEKLY' ? startOfWeek(now) : startOfMonth(now);

    const entries = await this.prisma.ranking.findMany({
      where: { periodType, periodStart },
      orderBy: { rankPosition: 'asc' },
      take: 100,
      include: { user: { select: { id: true, name: true } } },
    });

    const me = userId ? entries.find((entry) => entry.userId === userId) : undefined;
    return { periodType, periodStart, entries, me };
  }

  /**
   * Recomputes rank positions for a period from each user's accumulated XP.
   * Intended to run on a schedule (see AppModule's ScheduleModule wiring).
   */
  async recompute(periodType: PeriodType, periodStart: Date, periodEnd: Date) {
    const progresses = await this.prisma.userProgress.findMany({
      orderBy: { xpTotal: 'desc' },
      take: 500,
    });

    await this.prisma.$transaction(
      progresses.map((progress, index) =>
        this.prisma.ranking.upsert({
          where: {
            periodType_periodStart_userId: {
              periodType,
              periodStart,
              userId: progress.userId,
            },
          },
          update: { xpScore: progress.xpTotal, rankPosition: index + 1, periodEnd },
          create: {
            periodType,
            periodStart,
            periodEnd,
            userId: progress.userId,
            xpScore: progress.xpTotal,
            rankPosition: index + 1,
          },
        }),
      ),
    );
  }
}
