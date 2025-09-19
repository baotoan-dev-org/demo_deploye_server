import {
  Entity,
  ManyToOne,
  JoinColumn,
  Unique,
  Column,
} from 'typeorm';
import { Position } from '../../position/entities/position.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { SalaryRange } from './salary-range.entity';

@Entity('salary-range-position')
export class SalaryRangePosition extends BaseEntity {
  @ManyToOne(() => SalaryRange, (e) => e.salaryRangePositions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'salaryRangeId' })
  salaryRange: SalaryRange;

  @Column({type: 'uuid', length: 36})
  salaryRangeId: string;

  @Column({ type: 'uuid', length: 36})
  positionId: string;
  
  @ManyToOne(() => Position, (e) => e.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'positionId' })
  position: Position;
}
