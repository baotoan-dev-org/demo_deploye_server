import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { RoomPurposeStatus } from '../room.enum';

@Entity()
export class RoomPurpose extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RoomPurposeStatus, default: RoomPurposeStatus.ACTIVE })
  status: RoomPurposeStatus;
}
