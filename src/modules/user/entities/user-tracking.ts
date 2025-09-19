import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { UserTrackingType } from '../user.enum';
import { User } from './user.entity';
import { UpdateUserMovementDto } from '../dtos/movements/update-user-movement.dto';

@Entity({ comment: 'Table lưu lịch sử của user và user movement' })
export class UserTracking extends BaseEntity {
  @Column({ type: 'uuid', length: 36, nullable: true })
  userId: string;

  @Column({ type: 'uuid', length: 36, nullable: true })
  userMovementId: string;

  @Column({ type: 'json', nullable: true })
  oldValue: User | UpdateUserMovementDto;

  @Column({ type: 'json', nullable: true })
  newValue: User | UpdateUserMovementDto;

  @Column({ type: 'enum', enum: UserTrackingType })
  type: UserTrackingType;
}
