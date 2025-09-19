import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { JobLogAction, JobLogType } from '../job.enum';
import { Job } from './job.entity';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

@Entity()
export class JobLog extends BaseEntity {
  @Column({ type: 'enum', enum: JobLogAction })
  action: JobLogAction;

  @Column({ type: 'enum', enum: JobLogType })
  type: JobLogType;

  @Column({ type: 'json', nullable: true })
  oldValue: Object;

  @Column({ type: 'json', nullable: true })
  newValue: Object;

  @Column({ type: 'json', nullable: true })
  changes: ChangeItem[];

  @Column({ type: 'uuid', length: 36 })
  jobId: string;
  @ManyToOne(() => Job, (e) => e.jobLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;
}

export interface ChangeItem {
  field: string;
  from: any;
  to: any;
}

export class JobApproverLogDto {
  @IsUUID()
  jobId: string;

  @IsEnum(JobLogType)
  type: JobLogType.JOB_APPROVER;

  @IsEnum(JobLogAction)
  action: JobLogAction.APPROVE | JobLogAction.REJECT | JobLogAction.COMMENT;

  @IsOptional()
  @IsString()
  opinion?: string | null;

  @IsOptional()
  @IsString()
  reasonReject?: string | null;
}