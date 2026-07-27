import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { ChargesService } from './charges.service';

@UseGuards(JwtAuthGuard)
@Controller('charges')
export class ChargesController {
  constructor(private readonly chargesService: ChargesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chargesService.list(user.userId);
  }
}
