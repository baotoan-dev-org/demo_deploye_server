import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { FileStatus } from '../file.enum';

@Entity()
export class File extends BaseEntity {
  name: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ comment: 'The default 300 x 300', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column()
  size: number;

  @Column()
  mimetype: string;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.UNUSED })
  status: FileStatus;
}
