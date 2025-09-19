import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ProjectTask } from './project-task.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { ProjectTaskAssigneeInfo } from '../interfaces/project-task-assignee.interface';
import { AttachmentDto } from '@/common/dtos/attachment.dto';

@Entity()
export class ProjectTaskReport extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  taskName: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ngày bắt đầu của task',
  })
  startDate: Date;

  @Column({ type: 'json', nullable: true })
  assignees: ProjectTaskAssigneeInfo[];

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ default: 0, comment: 'Tiến độ của task tại thời điểm báo cáo (0-100)' })
  progressPercent: number;

  @Column({ type: 'decimal', nullable: true, default: 0, comment: 'Ngân sách đã sử dụng cho task' })
  usedBudget: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  reportAttachments: AttachmentDto[];

  @Column({ type: 'uuid', length: 36, nullable: true })
  projectTaskId: string;
  @ManyToOne(() => ProjectTask, (e) => e.progressReports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectTaskId' })
  projectTask: ProjectTask;
}
