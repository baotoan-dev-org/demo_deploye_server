import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Action } from './action.entity';

@Entity()
export class Module extends BaseEntity {
  name: string;

  @Column({ unique: true })
  path: string;

  @OneToMany(() => Action, (e) => e.module)
  actions: Action[];
}
