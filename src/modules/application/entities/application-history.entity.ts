import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { ApplicationHistoryAction } from '../application.enum';
import { Application } from './application.entity';

@Entity()
export class ApplicationHistory extends BaseEntity {
  @Column()
  applicationId: string;

  @ManyToOne(() => Application, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({ type: 'enum', enum: ApplicationHistoryAction })
  action: ApplicationHistoryAction;

  @Column({ type: 'uuid', length: 36,  nullable: true })
  actorId: string;

  @ManyToOne(() => User, (e) => e.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @Column({ type: 'text', nullable: true })
  changeDetail: string;
}
