import { Entity, Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProjectTask } from '@/modules/project-task/entities/project-task.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { DecimalColumnTransformer } from '@/common/decorators/decimal-column-transformer.decorator';
import { ProjectTaskProposalStatus, ProjectTaskProposalType } from '../project-task.enum';
import { ProjectTaskProposalApprover } from './project-task-proposal-approver.entity';
import { ProjectTaskProposalFollower } from './project-task-proposal-follower.entity';
import { ProjectTaskProposalValue } from '../interfaces/project-task-proposal.interface';

@Entity({ comment: 'Lưu các đề xuất của project / task' })
export class ProjectTaskProposal extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column({ type: 'text' })
  title: string;

  @Column({
    type: 'enum',
    enum: ProjectTaskProposalType,
    default: ProjectTaskProposalType.EXTEND_DEADLINE,
  })
  type: ProjectTaskProposalType;

  @Column({
    type: 'decimal',
    precision: 20,
    nullable: true,
    comment: 'Ngân sách của đơn vị tiền tệ',
    transformer: new DecimalColumnTransformer(),
  })
  amount: number;

  @Column({ default: 0, comment: 'Progress at the time of proposal request (0-100)' })
  progress: number;

  // Ngân sách của đơn vị
  @Column({
    type: 'decimal',
    nullable: true,
    comment: 'Ngân sách của đơn vị tiền tệ',
    precision: 20,
    scale: 2,
    transformer: new DecimalColumnTransformer(),
  })
  currencyBudget: number;

  // Đơn vị tiền tệ
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Đơn vị tiền tệ của ngân sách (VD: VND, USD, EUR)',
  })
  currency: string;
  // Tỉ giá
  @Column({
    type: 'float',
    nullable: true,
    comment: 'Tỉ giá của đơn vị tiền tệ tại thời điểm tạo task',
  })
  exchangeRate: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lưu giá trị cũ, cấu trúc phụ thuộc vào loại đề xuất',
  })
  oldValue: ProjectTaskProposalValue;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lưu giá trị mới, cấu trúc phụ thuộc vào loại đề xuất',
  })
  newValue: ProjectTaskProposalValue;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'json', nullable: true, comment: 'Lý do trễ hạn' })
  delayReasons: string[];

  @Column({ type: 'text', nullable: true })
  reasonReject: string;

  @Column({ type: 'json', nullable: true })
  attachments: AttachmentDto[];

  @Column({ default: 0, comment: 'Lưu % tại thời điểm đề xuất' })
  progressAtRequest: number;

  @Column({
    type: 'enum',
    enum: ProjectTaskProposalStatus,
    default: ProjectTaskProposalStatus.PENDING,
  })
  status: ProjectTaskProposalStatus;

  @Column({ type: 'uuid', length: 36, nullable: true })
  projectTaskId: string;
  @ManyToOne(() => ProjectTask, (e) => e.projectTaskProposals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectTaskId' })
  projectTask: ProjectTask;

  @OneToMany(() => ProjectTaskProposalApprover, (e) => e.proposal)
  projectTaskApprovers: ProjectTaskProposalApprover[];

  @OneToMany(() => ProjectTaskProposalFollower, (e) => e.proposal)
  projectTaskFollowers: ProjectTaskProposalFollower[];
}
