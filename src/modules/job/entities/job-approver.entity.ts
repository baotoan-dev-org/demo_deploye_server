import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { JobApproverStatus } from '../job.enum';
import { Job } from './job.entity';
import { JobRequestGroup } from './job-request-group.entity';

@Entity({ comment: 'Lưu tình trạng phê quyệt của những người phê duyệt đối với job' })
export class JobApprover extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: JobApproverStatus, default: JobApproverStatus.PENDING })
  status: JobApproverStatus;

  @Column({ type: 'text', nullable: true })
  reasonReject: string;

  @Column({ type: 'text', nullable: true })
  opinion: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', length: 36 })
  jobId: string;
  @ManyToOne(() => Job, (e) => e.jobApprovers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @Column({ type: 'uuid', length: 36 })
  approverId: string;
  @ManyToOne(() => User, (e) => e.jobApprovers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @Column({ type: 'uuid', length: 36 })
  requestGroupId: string;
  @ManyToOne(() => JobRequestGroup, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestGroupId' })
  requestGroup: JobRequestGroup;
}
