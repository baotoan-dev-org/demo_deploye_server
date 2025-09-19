import { Job } from '@/modules/job/entities/job.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { IndustryStatus } from '../industry.enum';

@Entity()
export class Industry extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: IndustryStatus, default: IndustryStatus.ACTIVE })
  status: IndustryStatus;

  @OneToMany(() => Job, (e) => e.industry)
  jobs: Job[];
}
