import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { ManufactBannerStatus } from '../manufacturing-recruitment.enum';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { ManufacturingRecruitment } from './manufacturing-recruitment.entity';

@Entity()
export class ManufactBanner extends BaseEntity {
  @Column({ comment: 'Chương trình tuyển dụng / Mục đích tuyển dụng'})
  name: string;

  @Column({ type: 'json', nullable: true, comment: 'Link banner' })
  attachments: AttachmentDto[];

  @Column({ type: 'enum', enum: ManufactBannerStatus, default: ManufactBannerStatus.ACTIVE })
  status: ManufactBannerStatus;

  @Column({ type: 'timestamp'})
  startDate: Date;

  @Column({ type: 'timestamp'})
  endDate: Date;

  @OneToMany(() => ManufacturingRecruitment, (e) => e.banner)
  manufacturingRecruitments: ManufacturingRecruitment[]
}

