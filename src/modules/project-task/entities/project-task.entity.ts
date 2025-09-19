import { BaseEntity } from '@/common/entities/base.entity';
import {
  Entity,
  Column,
  Tree,
  TreeChildren,
  TreeParent,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { ProjectTaskAssignee } from './project-task-assignee.entity';
import { ProjectTaskBudgetStatus, ProjectTaskStatus, ProjectTaskType } from '../project-task.enum';
import { ProjectTaskPriority } from '../project-task.enum';
import { ProjectTaskReport } from './project-task-report.entity';
import { ProjectTaskDependency } from './project-task-dependency.entity';
import { User } from '@/modules/user/entities/user.entity';
import { DecimalColumnTransformer } from '@/common/decorators/decimal-column-transformer.decorator';
import { ProjectTaskProposal } from './project-task-proposal.entity';

@Entity()
@Tree('closure-table')
export class ProjectTask extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProjectTaskType, nullable: true })
  type: ProjectTaskType;

  @Column({ type: 'enum', enum: ProjectTaskStatus, default: ProjectTaskStatus.ACTIVE })
  status: ProjectTaskStatus;

  @Column({ type: 'json', nullable: true, comment: 'Nguyên nhân trễ của task' })
  delayReasons: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  // Ngân sách của đơn vị
  @Column({
    type: 'decimal',
    precision: 20,
    nullable: true,
    comment: 'Ngân sách của đơn vị tiền tệ',
    transformer: new DecimalColumnTransformer(),
  })
  currencyBudget: number;

  // Ngân sách
  @Column({
    type: 'decimal',
    nullable: true,
    comment: 'Nếu null là không có ngân sách',
    precision: 20,
    transformer: new DecimalColumnTransformer(),
  })
  budget: number;

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

  // Ngân sách đã sử dụng
  @Column({ type: 'decimal', nullable: true, default: 0, comment: 'Ngân sách đã sử dụng' })
  usedBudget: number;

  // Ngân sách còn lại
  @Column({ type: 'decimal', nullable: true, default: 0, comment: 'Ngân sách còn lại' })
  remainingBudget: number;

  @Column({ type: 'boolean', default: false })
  isBudgetConfirmed: boolean;

  @Column({ type: 'json', nullable: true })
  attachments: AttachmentDto[];

  @Column({ type: 'json', nullable: true })
  reportAttachments: AttachmentDto[];

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimateDate: Date;

  @Column({ default: 0 })
  progressPercent: number;

  @Column({ type: 'text', nullable: true })
  lastReport: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'float', nullable: true, default: 0, comment: 'Tỉ trọng của task/dự án' })
  weight: number;

  @Column({ type: 'float', nullable: true, default: 0, comment: 'Trọng số còn lại của task/dự án' })
  remainingWeight: number;

  @Column({
    type: 'enum',
    enum: ProjectTaskBudgetStatus,
    default: ProjectTaskBudgetStatus.PROJECT_NOT_HAVE_BUDGET,
    comment: 'Trạng thái ngân sách của task/dự án',
  })
  budgetStatus: ProjectTaskBudgetStatus;

  @Column({
    type: 'enum',
    enum: ProjectTaskPriority,
    default: ProjectTaskPriority.NORMAL,
    comment: 'Mức độ ưu tiên của task/dự án',
  })
  priority: ProjectTaskPriority;

  @Column({ default: 0, comment: 'Số lượng các con, có thể là project / task' })
  childrenCount: number;

  @Column({ default: 0, comment: 'Số lượng các con hoàn thành, có thể là project / task' })
  completedChildrenCount: number;

  @OneToMany(() => ProjectTaskProposal, (e) => e.projectTask)
  projectTaskProposals: ProjectTaskProposal[];

  @OneToMany(() => ProjectTaskAssignee, (e) => e.projectTask)
  projectTaskAssignees: ProjectTaskAssignee[];

  @OneToMany(() => ProjectTaskReport, (e) => e.projectTask)
  progressReports: ProjectTaskReport[];

  // Phụ thuộc
  @OneToMany(() => ProjectTaskDependency, (e) => e.projectTask)
  dependencies: ProjectTaskDependency[];

  // Người theo dõi
  @ManyToMany(() => User)
  @JoinTable()
  followers: User[];

  @Column({ type: 'uuid', length: 36, nullable: true })
  parentId: string;
  @TreeParent({ onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: ProjectTask;

  @TreeChildren()
  children: ProjectTask[];
}
