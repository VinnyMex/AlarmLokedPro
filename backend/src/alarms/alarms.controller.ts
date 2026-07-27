import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { AlarmsService } from './alarms.service';
import { CreateAlarmDto } from './dto/create-alarm.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { ValidateChallengeDto } from './dto/validate-challenge.dto';
import { SkipItemDto } from './dto/skip-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAlarmDto) {
    return this.alarmsService.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.alarmsService.list(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alarmsService.get(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAlarmDto,
  ) {
    return this.alarmsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alarmsService.remove(user.userId, id);
  }

  @Post(':id/trigger')
  trigger(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alarmsService.trigger(user.userId, id);
  }

  @Post(':id/validate')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ValidateChallengeDto,
  ) {
    return this.alarmsService.validate(user.userId, id, dto);
  }

  @Post(':id/skip-item')
  skipItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SkipItemDto,
  ) {
    return this.alarmsService.skipItem(user.userId, id, dto);
  }
}
