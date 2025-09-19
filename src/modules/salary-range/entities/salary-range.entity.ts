import {
  Entity,
  Unique,
  Column,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { SalaryRangePosition } from './salary-range-position.entity';

@Entity('salary-range')
@Unique(['minSalary', 'maxSalary'])
export class SalaryRange extends BaseEntity {
  @Column({ default: 0})
  minSalary: number;

  @Column({ default: 0})
  maxSalary: number;

  @OneToMany(() => SalaryRangePosition, (e) => e.salaryRange)
  salaryRangePositions: SalaryRangePosition[];
  
}
