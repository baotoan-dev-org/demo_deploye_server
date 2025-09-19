import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Module } from './module.entity';
import { HttpMethod } from '@/common/enums/http-method.enum';

@Entity()
export class Action extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: HttpMethod })
  httpMethod: HttpMethod;

  @Column()
  path: string;

  @Column()
  primeValue: number;

  @Column({ type: 'uuid', length: 36 })
  moduleId: string;
  @ManyToOne(() => Module, (e) => e.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module: Module;
}
