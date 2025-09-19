import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Discussion } from './discussion.entity';
import { AttachmentDto } from '@/common/dtos/attachment.dto';

@Entity()
export class DiscussionHistory extends BaseEntity {
  @Column({ type: 'uuid' })
  discussionId: string;
  @ManyToOne(() => Discussion, (discussion) => discussion.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discussionId' })
  discussion: Discussion;

  @Column({ type: 'text', nullable: true })
  oldContent: string;

  @Column({ type: 'text', nullable: true })
  newContent: string;

  @Column({ type: 'json', nullable: true })
  oldAttachments: AttachmentDto[];

  @Column({ type: 'json', nullable: true })
  newAttachments: AttachmentDto[];
}
