import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAlarmDto {
  @IsString()
  title!: string;

  @IsString()
  scheduledAt!: string; // ISO 8601

  @IsOptional()
  @IsString()
  repeatPattern?: string;

  @IsString()
  timezone!: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsString()
  soundId!: string;

  @IsOptional()
  @IsBoolean()
  snoozeEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  snoozeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  challengeMode?: boolean;

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  challengeDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsString()
  itemType?: string; // pin a specific catalog item instead of a random one
}
