import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { Position } from '@/modules/position/entities/position.entity';
import { UserPositionType } from '../user.enum';

@Entity({ comment: 'Table lưu user thuộc đơn vị vào, vị trí là gì' })
@Unique(['userId', 'orgUnitId', 'positionId'])
export class UserOrgUnitPosition extends BaseEntity {
  @Column({ type: 'uuid', length: 36 })
  userId: string;
  @ManyToOne(() => User, (e) => e.userOrgUnitPositions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', length: 36 })
  positionId: string;
  @ManyToOne(() => Position, (e) => e.userOrgUnitPositions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @Column({ type: 'uuid', length: 36 })
  orgUnitId: string;
  @ManyToOne(() => OrgUnit, (e) => e.userOrgUnitPositions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgUnitId' })
  orgUnit: OrgUnit;

  @Column({ type: 'enum', enum: UserPositionType, default: UserPositionType.SUB })
  positionType: UserPositionType;
}
