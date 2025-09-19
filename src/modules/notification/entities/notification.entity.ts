import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { NotificationStatus, NotificationType } from '../notification.enum';
import { User } from '@/modules/user/entities/user.entity';

@Entity()
export class Notification extends BaseEntity {
  @Column()
  title: string;

  @Column()
  content: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.NOT_VIEWED })
  status: NotificationStatus;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'text', nullable: true })
  path: string;

  @Column({ type: 'uuid', length: 36 })
  userId: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
