import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ValidateChallengeDto {
  @IsString()
  attemptId!: string;

  @IsString()
  detectedLabel!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  boundingBoxAreaRatio!: number;

  @IsOptional()
  @IsString()
  frameBase64?: string;

  @IsOptional()
  @IsIn(['ON_DEVICE', 'CLOUD_VISION', 'CUSTOM_MODEL'])
  validationType?: 'ON_DEVICE' | 'CLOUD_VISION' | 'CUSTOM_MODEL';
}
