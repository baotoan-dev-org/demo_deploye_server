import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UpdateNotificationSettingDto } from '../dtos/update-notification-setting.dto';
import { QueryService } from 'src/common/services/query.service';
import { NotificationSetting } from '../entities/notification-setting.entity';
import { GetListNotificationSettingDto } from '../dtos/get-list-notification-setting.dto';
import { isBoolean } from 'class-validator';
import { NotificationType } from '../notification.enum';
import { ArrayService } from '@/common/services/array.service';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Injectable()
export class NotificationSettingService {
  constructor(
    private queryService: QueryService,

    private arrayService: ArrayService,

    @InjectRepository(NotificationSetting)
    private notificationSettingRepo: Repository<NotificationSetting>,
  ) {}

  async updateNotificationSetting(
    id: string,
    updateNotificationSettingDto: UpdateNotificationSettingDto,
    user: UserRequest,
  ) {
    return await this.notificationSettingRepo.update(
      { id, createdById: user.id },
      updateNotificationSettingDto,
    );
  }

  async getListNotificationSetting(
    getListNotificationSettingDto: GetListNotificationSettingDto,
    user: UserRequest,
  ) {
    const { page, take, orderBy, order, type, isReceive } = getListNotificationSettingDto;

    // Auto create when not exist
    const notiSetsDb = await this.notificationSettingRepo.find({
      where: { createdById: user.id },
      select: { id: true, type: true },
    });

    if (notiSetsDb.length !== Object.keys(NotificationType).length) {
      const notiSetsDbObj = this.arrayService.convertArrayToObj(notiSetsDb, ['type']);

      await this.notificationSettingRepo.insert(
        Object.values(NotificationType).reduce((r, type) => {
          if (!notiSetsDbObj[type]) r.push({ type, createdById: user.id });
          return r;
        }, []),
      );
    }

    const whereItem: FindOptionsWhere<NotificationSetting> = {
      createdById: user.id,
    };
    const where: FindOptionsWhere<NotificationSetting>[] = [whereItem];

    if (type) whereItem.type = type;
    if (isBoolean(isReceive)) whereItem.isReceive = isReceive;

    const [list, total] = await this.notificationSettingRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });

    return { total, list };
  }
}
