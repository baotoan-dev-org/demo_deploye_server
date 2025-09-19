import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { JobApproverStatus } from '../job.enum';
import { Job } from './job.entity';
import { JobApprover } from './job-approver.entity';

@Entity({ comment: 'Lưu lại các request' })
export class JobRequestGroup extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  
  @OneToMany(() => Job, (e) => e.requestGroup)
  jobs: Job[];

  @OneToMany(() => JobApprover, (e) => e.requestGroup)
  jobApprovers: JobApprover[];
}
