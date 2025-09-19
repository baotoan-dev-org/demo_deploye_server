import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { ProjectTaskProposalStatus } from '../project-task.enum';
import { ProjectTaskProposal } from './project-task-proposal.entity';

@Entity({ comment: 'Lưu tình trạng phê quyệt của những người phê duyệt đối với đề xuất' })
export class ProjectTaskProposalApprover extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ProjectTaskProposalStatus,
    default: ProjectTaskProposalStatus.PENDING,
  })
  status: ProjectTaskProposalStatus;

  @Column({ type: 'text', nullable: true })
  reasonReject: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', length: 36 })
  proposalId: string;
  @ManyToOne(() => ProjectTaskProposal, (e) => e.projectTaskApprovers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposalId' })
  proposal: ProjectTaskProposal;

  @Column({ type: 'uuid', length: 36, nullable: true })
  approverId: string;
  @ManyToOne(() => User, (e) => e.projectTaskProposalApprovers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approverId' })
  approver: User;
}
