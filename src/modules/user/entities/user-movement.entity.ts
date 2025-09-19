import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { RejectionReason, UserMovementStatus, UserMovementType } from '../user.enum';
import { MovementValueDto, UserValueDto } from '../dtos/movements/create-user-movement';
import { UserMovementApprover } from './user-movement-approve.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { Position } from '@/modules/position/entities/position.entity';
import { User } from './user.entity';
import { UserMovementNotify } from './user-movement-notify.entity';
import { CancelledUserMovementValue } from '../interfaces/movements.interface';

@Entity({ comment: 'Lưu thông tin bổ nhiệm của user với đơn vị, chức danh, nghề nghiệp' })
export class UserMovement extends BaseEntity {
  @Column({ type: 'enum', enum: UserMovementType })
  type: UserMovementType;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lưu giá trị cũ, ví dụ: chức danh cũ, đơn vị cũ, nghề nghiệp cũ',
  })
  oldValue: MovementValueDto & UserValueDto;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lưu giá trị mới, ví dụ: chức danh cũ, đơn vị cũ, nghề nghiệp cũ',
  })
  newValue: MovementValueDto;

  @Column({ type: 'text', comment: 'Lý do bổ nhiệm, điều chuyển, miễn nhiệm' })
  reason: string;

  @Column({ type: 'enum', enum: RejectionReason, default: null, comment: 'Lý do từ chối' })
  rejectionReason: RejectionReason;

  @Column({ type: 'text', nullable: true, comment: 'Lý do từ chối khác' })
  reasonReject: string;

  @Column({ type: 'enum', enum: UserMovementStatus, default: UserMovementStatus.PENDING })
  status: UserMovementStatus;

  @OneToMany(() => UserMovementApprover, (e) => e.userMovement)
  userMovementApprovers: UserMovementApprover[];

  @Column({ type: 'timestamp', comment: 'Ngày bổ nhiệm' })
  dateAppointment: Date;

  @Column({ type: 'uuid', length: 36, nullable: true })
  orgUnitId: string;
  @ManyToOne(() => OrgUnit, (orgUnit) => orgUnit.userMovements, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orgUnitId' })
  orgUnit: OrgUnit;

  @Column({ type: 'uuid', length: 36, nullable: true })
  positionId: string;
  @ManyToOne(() => Position, (position) => position.userMovements, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @Column({ type: 'uuid', length: 36, nullable: true })
  userId: string;
  @ManyToOne(() => User, (user) => user.userMovements, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => UserMovementNotify, (e) => e.userMovement)
  userMovementNotifications: UserMovementNotify[];

  @Column({ type: 'text', nullable: true, comment: 'File đính kèm' })
  file: string;

  @Column({ type: 'json', nullable: true, comment: 'Lưu giá trị huỷ ban hành' })
  cancelledValue: CancelledUserMovementValue;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ngày huỷ ban hành',
  })
  cancelledAt: Date;
}
