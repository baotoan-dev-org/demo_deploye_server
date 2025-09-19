import { BaseEntity } from 'src/common/entities/base.entity';
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
  OneToMany,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { OrgUnitStatus, OrgUnitType } from '../org-unit.enum';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { UserMovement } from '@/modules/user/entities/user-movement.entity';
import { JobTitle } from '@/modules/job-title/entities/job-title.entity';
import { SubManager } from '@/modules/user/entities/sub-manager.entity';

@Entity({ comment: 'Table lưu các đơn vị trong tổ chức' })
@Tree('closure-table')
export class OrgUnit extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true, type: 'longtext' })
  description: string;

  @Column({ type: 'enum', enum: OrgUnitType })
  type: OrgUnitType;

  @Column({ type: 'enum', enum: OrgUnitStatus, default: OrgUnitStatus.ACTIVE })
  status: OrgUnitStatus;

  @Column({ default: 0 })
  totalMember: number;

  @Column({ type: 'uuid', length: 36, nullable: true })
  parentId: string;
  @TreeParent({ onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: OrgUnit;

  @TreeChildren()
  children: OrgUnit[];

  @Column({ type: 'uuid', length: 36, nullable: true })
  managerId: string;
  @ManyToOne(() => User, (e) => e.managedOrgUnits, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managerId' })
  manager: User;

  @OneToMany(() => UserOrgUnitPosition, (userOrgUnitPosition) => userOrgUnitPosition.orgUnit)
  userOrgUnitPositions: UserOrgUnitPosition[];

  @OneToMany(() => UserMovement, (userMovement) => userMovement.orgUnit)
  userMovements: UserMovement[];

  @OneToMany(() => JobTitle, (e) => e.orgUnit)
  jobTitles: JobTitle[];

  @OneToMany(() => SubManager, (subManager) => subManager.orgUnit)
  subManagers: SubManager[];

  @OneToMany(() => SubManager, (subManager) => subManager.orgUnitParent)
  subManagersParent: SubManager[];
}
