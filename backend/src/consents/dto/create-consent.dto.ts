import { IsEnum, IsString } from 'class-validator';

export enum ConsentTypeDto {
  TERMS_OF_USE = 'TERMS_OF_USE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  CAMERA = 'CAMERA',
  LOCATION = 'LOCATION',
  WEATHER = 'WEATHER',
  MARKETING = 'MARKETING',
}

export class CreateConsentDto {
  @IsEnum(ConsentTypeDto)
  consentType!: ConsentTypeDto;

  @IsString()
  version!: string;

  @IsString()
  source!: string;
}
