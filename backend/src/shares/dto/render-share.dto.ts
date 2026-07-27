import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RenderShareDto {
  @IsOptional()
  @IsString()
  alarmId?: string;

  @IsString()
  templateCode!: string;

  @IsOptional()
  @IsBoolean()
  includeWeather?: boolean;

  @IsOptional()
  @IsBoolean()
  includeLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTime?: boolean;

  @IsOptional()
  @IsString()
  watermarkText?: string;
}
