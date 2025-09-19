import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { Notification } from './entities/notification.entity';
import { NotificationHandle } from './notification.handle';
import { NotificationSetting } from './entities/notification-setting.entity';
import { NotificationSettingController } from './controllers/notification-setting.controller';
import { NotificationSettingService } from './services/notification-setting.service';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationSetting, User])],
  controllers: [NotificationController, NotificationSettingController],
  providers: [NotificationService, NotificationSettingService, NotificationHandle],
  exports: [NotificationService, NotificationSettingService, NotificationHandle, TypeOrmModule],
})
export class NotificationModule {}
