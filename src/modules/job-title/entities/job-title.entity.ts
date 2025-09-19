import { Job } from '@/modules/job/entities/job.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, Unique } from 'typeorm';
import { JobTitleStatus } from '../job-title.enum';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { Position } from '@/modules/position/entities/position.entity';
import { AttachmentDto } from '@/common/dtos/attachment.dto';

@Entity()
export class JobTitle extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: JobTitleStatus, default: JobTitleStatus.ACTIVE })
  status: JobTitleStatus;

  @Column({ type: 'text', nullable: true, comment: 'Mô tả công việc' })
  description: string;

  @Column({ type: 'text', nullable: true, comment: 'Yêu cầu công việc' })
  requirement: string;

  @Column({ type: 'text', nullable: true, comment: 'Phúc lợi' })
  welfare: string;

  @Column({ type: 'json', nullable: true, comment: 'JD của chức danh tuyển dụng' })
  attachments: AttachmentDto[];

  @Column({ type: 'uuid', length: 36 })
  orgUnitId: string;

  @ManyToOne(() => OrgUnit, (e) => e.jobTitles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgUnitId' })
  orgUnit: OrgUnit;

  @Column({ type: 'uuid', length: 36 })
  positionId: string;

  @ManyToOne(() => Position, (e) => e.jobTitles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @OneToMany(() => Job, (e) => e.jobTitle)
  jobs: Job[];
}
