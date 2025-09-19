import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { UserMovement } from './user-movement.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity({
  comment: 'Lưu user sẽ nhận thông báo sau phê duyệt đối với bổ nhiệm, điều chuyển, miễn nhiệm',
})
export class UserMovementNotify extends BaseEntity {
  @Column({ type: 'uuid', length: 36 })
  userMovementId: string;
  @ManyToOne(() => UserMovement, (e) => e.userMovementNotifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userMovementId' })
  userMovement: UserMovement;

  @Column({ type: 'uuid', length: 36, nullable: true })
  userId: string;
  @ManyToOne(() => User, (user) => user.userNotifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
