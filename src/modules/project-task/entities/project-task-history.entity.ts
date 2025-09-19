import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ProjectTaskType, ProjectTaskHistoryAction } from '../project-task.enum';
import { ProjectTask } from './project-task.entity';

@Entity()
export class ProjectTaskHistory extends BaseEntity {
  @Column({ type: 'enum', enum: ProjectTaskType })
  type: ProjectTaskType;

  @Column({ type: 'enum', enum: ProjectTaskHistoryAction })
  action: ProjectTaskHistoryAction;

  @Column({ type: 'uuid', length: 36 })
  projectTaskId: string;
  @ManyToOne(() => ProjectTask, (e) => e.projectTaskAssignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectTaskId' })
  projectTask: ProjectTask;

  @Column({ type: 'json', nullable: true })
  oldValue: Object;

  @Column({ type: 'json', nullable: true })
  newValue: Object;

  @Column({ type: 'simple-array', nullable: true })
  changedFields: string[];
}
