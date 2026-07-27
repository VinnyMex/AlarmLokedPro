import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { SharesService } from './shares.service';
import { RenderShareDto } from './dto/render-share.dto';

@UseGuards(JwtAuthGuard)
@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post('render')
  render(@CurrentUser() user: AuthenticatedUser, @Body() dto: RenderShareDto) {
    return this.sharesService.render(user.userId, dto);
  }
}
