import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { GetListNotificationDto } from '../dtos/get-list-notification.dto';
import { Notification } from '../entities/notification.entity';
import { QueryService } from 'src/common/services/query.service';
import { FCMService } from 'src/common/services/fcm.service';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { UpdateNotificationDto } from '../dtos/update-notification.dto';
import {
  NotificationStatus,
  NotificationType,
  UpdateNotificationAction,
} from '../notification.enum';
import { CreateManyNotificationDto } from '../dtos/create-many-notification.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Injectable()
export class NotificationService {
  constructor(
    private queryService: QueryService,

    private fcmService: FCMService,

    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {}

  async testNotification(topic: string, userId: string) {
    return await Promise.all([
      this.fcmService.sendMessageToTopic({
        topic,
        title: 'This is title',
        message: 'This is message',
        path: 'https://google.com.vn',
        payload: {},
      }),
      this.notificationRepo.insert([
        {
          title: 'This is title 1',
          content: 'This is content short',
          type: NotificationType.SYSTEM,
          path: '/',
          createdById: userId,
          userId,
        },
      ]),
    ]);
  }

  async createNotification(params: {
    notification: CreateNotificationDto;
    isPushFCM: boolean;
    payloadFCM?: any;
    manager?: EntityManager;
  }) {
    const { notification, isPushFCM, manager, payloadFCM } = params;

    await Promise.all([
      isPushFCM &&
        this.fcmService.sendMessageToTopic({
          topic: notification.userId,
          title: notification.title,
          message: notification.content,
          path: notification.path,
          payload: payloadFCM,
        }),
      manager
        ? manager.insert(Notification, notification)
        : this.notificationRepo.insert(notification),
    ]);

    return { success: true };
  }

  async createManyNotification(params: {
    notification: CreateManyNotificationDto;
    isPushFCM: boolean;
    payloadFCM?: any;
    manager?: EntityManager;
  }) {
    const { notification, isPushFCM, manager, payloadFCM } = params;

    const { userIds, ...notificationPush } = notification;

    await Promise.all([
      ...(isPushFCM
        ? userIds.map((userId) =>
            this.fcmService.sendMessageToTopic({
              topic: userId,
              title: notification.title,
              message: notification.content,
              path: notification.path,
              payload: payloadFCM,
            }),
          )
        : []),
      manager
        ? manager.insert(
            Notification,
            userIds.map((userId) => ({ ...notificationPush, userId })),
          )
        : this.notificationRepo.insert(userIds.map((userId) => ({ ...notificationPush, userId }))),
    ]);

    return { success: true };
  }

  async updateNotification(updateNotificationDto: UpdateNotificationDto, user: UserRequest) {
    const { id, updateNotificationAction } = updateNotificationDto;

    switch (updateNotificationAction) {
      case UpdateNotificationAction.VIEW_ONE:
        await this.notificationRepo.update(id, {
          status: NotificationStatus.VIEWED,
        });

        break;
      case UpdateNotificationAction.VIEW_ALL:
        await this.notificationRepo.update(
          { userId: user.id, status: NotificationStatus.NOT_VIEWED },
          { status: NotificationStatus.VIEWED },
        );

        break;
      case UpdateNotificationAction.DELETE_VIEWED:
        await this.notificationRepo.delete({
          userId: user.id,
          status: NotificationStatus.VIEWED,
        });

        break;
      case UpdateNotificationAction.DELETE_ONE:
        await this.notificationRepo.delete({
          userId: user.id,
          id,
        });

        break;
      default:
        await this.notificationRepo.delete({
          userId: user.id,
        });

        break;
    }

    return { success: true };
  }

  async getListNotification(getListNotificationDto: GetListNotificationDto, user: UserRequest) {
    const { page, take, orderBy, order, search, type, status } = getListNotificationDto;

    const whereItem: FindOptionsWhere<Notification> = { userId: user.id };
    let where: FindOptionsWhere<Notification>[] = [whereItem];

    if (type) whereItem.type = type;
    if (status) whereItem.status = status;

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['title', 'content'],
        search,
        whereItem,
      });

    const [list, total] = await this.notificationRepo.findAndCount({
      relations: { createdBy: true },
      where,
      select: { createdBy: { name: true, url: true } },
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });

    return { total, list };
  }
}
