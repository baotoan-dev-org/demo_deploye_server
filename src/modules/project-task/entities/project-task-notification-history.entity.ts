import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { ProjectTask } from './project-task.entity';

@Entity()
export class ProjectTaskNotificationHistory extends BaseEntity {
  @Column({ type: 'uuid' })
  projectTaskId: string;
  @ManyToOne(() => ProjectTask, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectTaskId' })
  projectTask: ProjectTask;

  @Column({ type: 'timestamp', nullable: false })
  lastNotifiedAt: Date;
}
