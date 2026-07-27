import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { ConsentsService } from './consents.service';
import { CreateConsentDto } from './dto/create-consent.dto';

@UseGuards(JwtAuthGuard)
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  grant(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConsentDto) {
    return this.consentsService.grant(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.consentsService.list(user.userId);
  }
}
