import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { SubManagerStatus } from '../user.enum';

@Entity({ comment: 'Table lưu user là sub manager của đơn vị' })
@Unique(['userId', 'orgUnitId', 'status'])
export class SubManager extends BaseEntity {
  @Column({ type: 'uuid', length: 36 })
  userId: string;
  @ManyToOne(() => User, (e) => e.subManagers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', length: 36 })
  orgUnitId: string;
  @ManyToOne(() => OrgUnit, (e) => e.subManagers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgUnitId' })
  orgUnit: OrgUnit;

  @Column({ type: 'uuid', length: 36 })
  orgUnitParentId: string;
  @ManyToOne(() => OrgUnit, (e) => e.subManagersParent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgUnitParentId' })
  orgUnitParent: OrgUnit;

  @Column({ type: 'enum', enum: SubManagerStatus, default: SubManagerStatus.ACTIVE })
  status: SubManagerStatus;
}
