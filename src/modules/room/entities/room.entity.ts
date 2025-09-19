import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { RoomGroup } from './room-group.entity';
import { RoomGroupStatus } from '../room.enum';

@Entity()
export class Room extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'uuid', length: 36, nullable: true })
  roomGroupId: string;
  @ManyToOne(() => RoomGroup, (e) => e.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roomGroupId' })
  roomGroup: RoomGroup;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: RoomGroupStatus, default: RoomGroupStatus.ACTIVE })
  status: RoomGroupStatus;

  @Column({ type: 'int', nullable: false })
  capacity: number;
}
