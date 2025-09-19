import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import {
  RejectionReason,
  UserApproveTransferType,
  UserMovementApproveType,
  UserMovementStatus,
} from '../user.enum';
import { User } from './user.entity';
import { UserMovement } from './user-movement.entity';

@Entity({
  comment:
    'Lưu tình trạng phê quyệt của những người phê duyệt đối với bổ nhiệm, điều chuyển, miễn nhiệm',
})
export class UserMovementApprover extends BaseEntity {
  @Column({ type: 'enum', enum: UserMovementStatus, default: UserMovementStatus.PENDING })
  status: UserMovementStatus;

  @Column({ type: 'enum', enum: RejectionReason, default: null, comment: 'Lý do từ chối' })
  rejectionReason: RejectionReason;

  @Column({ type: 'text', nullable: true, comment: 'Lý do từ chối khác' })
  reasonReject: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', length: 36 })
  userMovementId: string;
  @ManyToOne(() => UserMovement, (e) => e.userMovementApprovers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userMovementId' })
  userMovement: UserMovement;

  @Column({ type: 'uuid', length: 36, nullable: true })
  approverId: string;
  @ManyToOne(() => User, (e) => e.userApprovers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @Column({ type: 'int', comment: 'Thứ tự của người phê duyệt trong chuỗi phê duyệt' })
  order: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Người phê duyệt có quyền phê duyệt hay không',
  })
  allowedApprove: boolean;

  @Column({ type: 'enum', enum: UserApproveTransferType, default: UserApproveTransferType.NEW })
  transferType: UserApproveTransferType;

  @Column({ type: 'enum', enum: UserMovementApproveType, default: UserMovementApproveType.APPROVE })
  approveType: UserMovementApproveType;
}
