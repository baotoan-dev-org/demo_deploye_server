import { User } from 'src/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', length: 36, nullable: true })
  createdById: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', length: 36, nullable: true })
  updatedById: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User;

  @Column({ type: 'uuid', length: 36, nullable: true })
  deletedById: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deletedById' })
  deletedBy: User;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
