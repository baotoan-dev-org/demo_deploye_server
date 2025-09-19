import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ProjectTask } from './project-task.entity';

@Entity()
@Unique(['projectTaskId', 'dependsOnTaskId'])
export class ProjectTaskDependency extends BaseEntity {
  @Column({ type: 'uuid' })
  projectTaskId: string;
  @ManyToOne(() => ProjectTask, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectTaskId' })
  projectTask: ProjectTask;

  @Column({ type: 'uuid' })
  dependsOnTaskId: string;
  @ManyToOne(() => ProjectTask, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dependsOnTaskId' })
  dependsOnTask: ProjectTask;

  @Column({ type: 'int' })
  offsetDays: number;
}
