import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { NotificationType } from '../notification.enum';

@Entity()
export class NotificationSetting extends BaseEntity {
  @PrimaryColumn({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ default: true })
  isReceive: boolean;
}
