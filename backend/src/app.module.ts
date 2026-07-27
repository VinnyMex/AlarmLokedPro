import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma.module';
import { AuditLogService } from './common/audit-log.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConsentsModule } from './consents/consents.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ChargesModule } from './charges/charges.module';
import { AlarmsModule } from './alarms/alarms.module';
import { ProgressModule } from './progress/progress.module';
import { RankingsModule } from './rankings/rankings.module';
import { SharesModule } from './shares/shares.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { VisionModule } from './vision/vision.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ConsentsModule,
    SubscriptionsModule,
    ChargesModule,
    AlarmsModule,
    ProgressModule,
    RankingsModule,
    SharesModule,
    AuditLogsModule,
    VisionModule,
  ],
  providers: [AuditLogService],
})
export class AppModule {}
