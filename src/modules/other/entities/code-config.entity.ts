import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CodeConfigType } from '../other.enum';

@Entity()
export class CodeConfig {
  @PrimaryColumn({ type: 'enum', enum: CodeConfigType })
  type: CodeConfigType;

  @Column()
  currentMax: number;
}
