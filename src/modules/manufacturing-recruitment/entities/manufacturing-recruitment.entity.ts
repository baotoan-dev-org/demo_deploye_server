import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Gender, ManufacturingRecruitmentStatus } from '../manufacturing-recruitment.enum';
import { ManufactBanner } from './manufact-banner.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity()
export class ManufacturingRecruitment extends BaseEntity {
  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({type: 'timestamp'})
  birthday: Date;

  @Column()
  address: string;

  @Column({ type: 'enum', enum: Gender, default: Gender.FEMALE})
  gender: string;

  @Column({ type: 'text', nullable: true})
  referralCode: string;

  @ManyToOne(() => User, (e) => e.code, { nullable: true })
  @JoinColumn({ name: 'referralCode', referencedColumnName: 'code' }) 
  referrer: User | null;

  @Column({ type: 'enum', enum: ManufacturingRecruitmentStatus, default: ManufacturingRecruitmentStatus.PENDING })
  status: ManufacturingRecruitmentStatus;

  @Column({ type: 'text', nullable: true })
  rejectReason: string;

  @Column({ type: 'uuid', length: 36, nullable: true })
  bannerId: string;
  @ManyToOne(() => ManufactBanner, (e) => e.id, { onDelete: 'SET NULL'})
  @JoinColumn({ name: 'bannerId'})
  banner: ManufactBanner
}

