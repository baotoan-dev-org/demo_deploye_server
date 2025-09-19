import {
  Entity,
  Column,
  Tree,
  TreeChildren,
  TreeParent,
  JoinColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { PositionStatus, PositionSubManager, PositionType } from '../position.enum';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { UserMovement } from '@/modules/user/entities/user-movement.entity';
import { JobTitle } from '@/modules/job-title/entities/job-title.entity';
import { SalaryRangePosition } from '@/modules/salary-range/entities/salary-range-position.entity';

@Entity()
@Tree('closure-table')
@Unique(['name'])
export class Position extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true, type: 'text', comment: 'Mô tả chức vụ' })
  description: string;

  @Column({ nullable: true, type: 'text', comment: 'Mô tả nhiệm vụ chức vụ' })
  task: string;

  @Column({ nullable: true, type: 'text', comment: 'Mô tả quyền hạn chức vụ' })
  authority: string;

  @Column({ type: 'enum', enum: PositionStatus, default: PositionStatus.ACTIVE })
  status: PositionStatus;

  @Column({ type: 'enum', enum: PositionType, default: PositionType.STAFF })
  type: PositionType;

  @Column({ type: 'enum', enum: PositionSubManager, default: PositionSubManager.MEMBER })
  subManager: PositionSubManager;

  @Column({ type: 'uuid', length: 36, nullable: true })
  parentId: string;
  @TreeParent({ onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: Position;

  @TreeChildren()
  children: Position[];

  @OneToMany(() => UserOrgUnitPosition, (e) => e.position)
  userOrgUnitPositions: UserOrgUnitPosition[];

  @OneToMany(() => UserMovement, (userMovement) => userMovement.position)
  userMovements: UserMovement[];

  @Column({ type: 'int', default: 1 })
  level: number;

  @OneToMany(() => JobTitle, (e) => e.orgUnit)
  jobTitles: JobTitle[];

  @OneToMany(() => SalaryRangePosition, (e) => e.position)
  salaryRangePositions: SalaryRangePosition[];
}
