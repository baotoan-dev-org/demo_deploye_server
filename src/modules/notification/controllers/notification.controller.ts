import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Put, Body, Get, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { GetListNotificationDto } from '../dtos/get-list-notification.dto';
import { UpdateNotificationDto } from '../dtos/update-notification.dto';
import { NotificationService } from '../services/notification.service';
import { Route } from 'src/common/decorators/route.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Route('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Update notification' })
  @JwtAuth()
  @Put()
  updateNotification(
    @Body() updateNotificationDto: UpdateNotificationDto,
    @User() user: UserRequest,
  ) {
    return this.notificationService.updateNotification(updateNotificationDto, user);
  }

  @ApiOperation({ summary: 'Get list notification' })
  @JwtAuth()
  @Get()
  getListNotification(
    @Query() getListNotificationDto: GetListNotificationDto,
    @User() user: UserRequest,
  ) {
    return this.notificationService.getListNotification(getListNotificationDto, user);
  }
}
