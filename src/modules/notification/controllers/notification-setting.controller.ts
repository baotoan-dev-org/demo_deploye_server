import { Body, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { NotificationSettingService } from '../services/notification-setting.service';
import { UpdateNotificationSettingDto } from '../dtos/update-notification-setting.dto';
import { Route } from 'src/common/decorators/route.decorator';
import { JwtAuth } from 'src/common/decorators/jwt-auth.decorator';
import { GetListNotificationSettingDto } from '../dtos/get-list-notification-setting.dto';
import { User } from 'src/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Route('notification-setting')
export class NotificationSettingController {
  constructor(private notificationSettingService: NotificationSettingService) {}

  @ApiOperation({ summary: 'Update notification setting' })
  @JwtAuth()
  @Put(':id')
  updateNotificationSetting(
    @Param('id') id: string,
    @Body() updateNotificationSettingDto: UpdateNotificationSettingDto,
    @User() user: UserRequest,
  ) {
    return this.notificationSettingService.updateNotificationSetting(
      id,
      updateNotificationSettingDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Get list notification setting' })
  @JwtAuth()
  @Get()
  getListNotificationSetting(
    @Query() getListNotificationSettingDto: GetListNotificationSettingDto,
    @User() user: UserRequest,
  ) {
    return this.notificationSettingService.getListNotificationSetting(
      getListNotificationSettingDto,
      user,
    );
  }
}
