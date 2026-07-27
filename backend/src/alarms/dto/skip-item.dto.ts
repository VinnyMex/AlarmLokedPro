import { IsString } from 'class-validator';

export class SkipItemDto {
  @IsString()
  attemptId!: string;
}
