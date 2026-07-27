import { IsIn, IsString } from 'class-validator';

export class SubscribeDto {
  @IsString()
  paymentMethodToken!: string;

  @IsIn(['STRIPE', 'APPLE_IAP', 'GOOGLE_PLAY'])
  provider!: 'STRIPE' | 'APPLE_IAP' | 'GOOGLE_PLAY';
}
