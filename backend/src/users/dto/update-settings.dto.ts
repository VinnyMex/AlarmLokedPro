import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableLocationShare?: boolean;

  @IsOptional()
  @IsBoolean()
  enableWeatherShare?: boolean;

  @IsOptional()
  @IsBoolean()
  enableTimeShare?: boolean;

  @IsOptional()
  @IsBoolean()
  enableWatermark?: boolean;

  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @IsOptional()
  @IsIn(['LIGHT', 'DARK', 'SYSTEM'])
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  alarmVolume?: number;

  @IsOptional()
  @IsBoolean()
  vibrationEnabled?: boolean;
}
