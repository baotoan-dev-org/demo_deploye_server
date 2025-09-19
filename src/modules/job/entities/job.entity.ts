import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { JobPriority, JobStatus, JobTag, JobType, RecruitmentPlatform, RecruitmentReason, WorkArea } from '../job.enum';
import { Application } from '@/modules/application/entities/application.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { Industry } from '@/modules/industry/entities/industry.entity';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { JobApprover } from './job-approver.entity';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { User } from '@/modules/user/entities/user.entity';
import { JobTitle } from '@/modules/job-title/entities/job-title.entity';
import { JobRequestGroup } from './job-request-group.entity';
import { JobLog } from './job-log.entity';

@Entity()
export class Job extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: JobTag, nullable: true })
  tag: JobTag;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({ type: 'enum', enum: WorkArea, default: WorkArea.OFFICE })
  address: WorkArea;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment:
      'Ngày này phải < expectedOnboardDate tại thời điểm chuyển trạng thái sang Đang tuyển. Sau đó thì có thể quá hạn',
  })
  expiredDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  requirement: string;

  @Column({ type: 'text', nullable: true, comment: 'Phúc lợi' })
  welfare: string;

  @Column({ nullable: true })
  minSalary: number;

  @Column({ nullable: true })
  maxSalary: number;

  // Các trường sau uddate trong quá trình tuyển dụng
  @Column({ default: 0 })
  appliedCount: number;

  @Column({ default: 0 })
  interviewedCount: number;

  @Column({ default: 0 })
  passedInterviewCount: number;

  @Column({ default: 0 })
  acceptanceCount: number;

  @Column({ default: 0 })
  onboardCount: number;

  @Column({ default: 0 })
  notQualifiedCount: number;

  // Các trường dành cho khi status là Chờ phê duyệt (Tức là mới chỉ required từ các manager ở các unit)
  @Column({ type: 'enum', enum: JobType, default: JobType.FULLTIME })
  type: JobType;

  @Column({ nullable: true })
  experienceNumber: number;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'timestamp', nullable: true, comment: 'Ngày mong đợi có nhân sự' })
  expectedOnboardDate: Date;

  @Column({ type: 'enum', enum: JobPriority, default: JobPriority.NORMAL })
  priority: JobPriority;

  @Column({ comment: 'Mức lương dự kiến tối thiểu' })
  minExpectedSalary: number;

  @Column({ comment: 'Mức lương dự kiến tối đa' })
  maxExpectedSalary: number;

  @Column({ type: 'enum', enum: RecruitmentReason, default: RecruitmentReason.NEW_HIRE })
  recruitmentReason: RecruitmentReason;

  @Column({ type: 'json', nullable: true, comment: 'Tài liệu đính kèm của người tạo yêu cầu' })
  attachments: AttachmentDto[];

  @Column({ type: 'text', nullable: true, comment: 'Lý HR từ chối' })
  hrRejectReason: string;

  @Column({ type: 'uuid', length: 36, nullable: true })
  hrRejectedById: string;
  
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hrRejectedById' })
  hrRejectedBy: User;

  @Column({type: 'text', nullable: true, comment: 'Ghi chú'})
  note: string;

  @Column({ type: 'timestamp', nullable: true })
  postedDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completionDate?: Date;

  @Column({ default: 0})
  budget: number;

  @Column({type: 'enum', enum: RecruitmentPlatform, default: RecruitmentPlatform.OFFICE_SEVAGO})
  platform: RecruitmentPlatform;

  @Column({type: 'text', nullable: true})
  slug: string;

  @Column({ type: 'uuid', length: 36 })
  orgUnitId: string;
  @ManyToOne(() => OrgUnit, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgUnitId' })
  orgUnit: OrgUnit;

  @Column({ type: 'uuid', length: 36, nullable: true })
  industryId: string;
  @ManyToOne(() => Industry, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'industryId' })
  industry: Industry;

  @Column({ type: 'uuid', length: 36 })
  positionId: string;
  @ManyToOne(() => Position, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @OneToMany(() => Application, (e) => e.job)
  applications: Application[];

  @OneToMany(() => JobApprover, (e) => e.job)
  jobApprovers: JobApprover[];

  @Column({ type: 'uuid', length: 36, nullable: true })
  ownerId: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ type: 'uuid', length: 36, nullable: true})
  jobTitleId: string;
  @ManyToOne(() => JobTitle, (e) => e.jobs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'jobTitleId' })
  jobTitle: JobTitle;

  @Column({ type: 'uuid', length: 36 })
  requestGroupId: string;
  @ManyToOne(() => JobRequestGroup, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestGroupId' })
  requestGroup: JobRequestGroup;

  @OneToMany(() => JobLog, (e) => e.job)
  jobLogs: JobLog[];
}
