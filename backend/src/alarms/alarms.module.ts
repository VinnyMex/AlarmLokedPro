import { Module } from '@nestjs/common';
import { AlarmsService } from './alarms.service';
import { AlarmsController } from './alarms.controller';
import { ProgressModule } from '../progress/progress.module';
import { ChargesModule } from '../charges/charges.module';
import { VisionModule } from '../vision/vision.module';

@Module({
  imports: [ProgressModule, ChargesModule, VisionModule],
  controllers: [AlarmsController],
  providers: [AlarmsService],
  exports: [AlarmsService],
})
export class AlarmsModule {}
