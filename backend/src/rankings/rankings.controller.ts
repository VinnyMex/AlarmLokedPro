import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PeriodType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { RankingsService } from './rankings.service';

@UseGuards(JwtAuthGuard)
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'weekly' | 'monthly' = 'weekly',
  ) {
    const periodType = period === 'monthly' ? PeriodType.MONTHLY : PeriodType.WEEKLY;
    return this.rankingsService.list(periodType, user.userId);
  }
}
