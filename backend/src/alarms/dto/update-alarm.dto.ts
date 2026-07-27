import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateAlarmDto } from './create-alarm.dto';

export class UpdateAlarmDto extends PartialType(
  OmitType(CreateAlarmDto, ['itemType'] as const),
) {
  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED'])
  status?: 'ACTIVE' | 'PAUSED';
}
