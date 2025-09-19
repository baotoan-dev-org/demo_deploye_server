import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { ApplicationStatus } from '../application.enum';
import { Job } from '@/modules/job/entities/job.entity';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { RecruitmentPlatform } from '@/modules/job/job.enum';

@Entity()
export class Application extends BaseEntity {
  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @Column({ type: 'text' })
  cvUrl: string;

  @Column({ type: 'text', nullable: true })
  coverLetter: string;

  @Column({ type: 'text', nullable: true })
  rejectReason: string;

  @Column({type: 'enum', enum: RecruitmentPlatform, default: RecruitmentPlatform.OFFICE_SEVAGO})
  platform: RecruitmentPlatform;

  @Column({ type: 'json', nullable: true })
  attachments: AttachmentDto[];

  @Column({ type: 'json', nullable: true })
  ccEmails: string[];

  @Column({ type: 'json', nullable: true })
  bccEmails: string[];

  @Column({ type: 'text', nullable: true})
  referralCode: string;

  @ManyToOne(() => User, (e) => e.code, { nullable: true })
  @JoinColumn({ name: 'referralCode', referencedColumnName: 'code' }) 
  referrer: User | null;

  @Column({ type: 'uuid', length: 36 })
  candidateId: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  @Column({ type: 'uuid', length: 36 })
  jobId: string;
  @ManyToOne(() => Job, (e) => e.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;
}
