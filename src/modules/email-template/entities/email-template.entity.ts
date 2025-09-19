import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ApplicationStatus } from '@/modules/application/application.enum';

@Entity()
export class EmailTemplate extends BaseEntity {
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;
}
