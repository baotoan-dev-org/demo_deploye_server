import { Entity, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/user/entities/user.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { RoomGroupApprovalProcess, RoomGroupStatus } from '../room.enum';

@Entity()
export class RoomGroup extends BaseEntity {
  @Column({ type: 'varchar', nullable: false, length: 255 })
  name: string;

  @ManyToMany(() => User)
  @JoinTable()
  managers: User[];

  @ManyToMany(() => User)
  @JoinTable()
  approvers: User[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RoomGroupStatus, default: RoomGroupStatus.ACTIVE })
  status: RoomGroupStatus;

  @Column({ type: 'float', nullable: false })
  maxMeetingDurationHours: number;

  @Column({ type: 'float', nullable: false })
  systemReminderMinutes: number;

  @Column({
    type: 'enum',
    enum: RoomGroupApprovalProcess,
    default: RoomGroupApprovalProcess.ALL_APPROVERS,
  })
  approvalProcess: RoomGroupApprovalProcess;

  @ManyToMany(() => OrgUnit)
  @JoinTable()
  organizationUnits: OrgUnit[];
}
