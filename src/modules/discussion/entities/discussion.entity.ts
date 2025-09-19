import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, OneToMany, Tree, TreeChildren, TreeParent } from 'typeorm';
import { DiscussionTag } from './discussion-tag.entity';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { DiscussionType } from '../discussion.enum';

@Entity()
@Tree('closure-table')
export class Discussion extends BaseEntity {
  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: DiscussionType })
  type: DiscussionType;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'uuid', length: 36, nullable: true })
  parentId: string;
  @TreeParent({ onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: Discussion;

  @TreeChildren()
  children: Discussion[];

  @Column({ type: 'int', default: 0 })
  childrenCount: number;

  @OneToMany(() => DiscussionTag, (tag) => tag.discussion, { cascade: true })
  discussionTags: DiscussionTag[];

  @Column({ type: 'json', nullable: true })
  attachments: AttachmentDto[];

  @Column({ type: 'json', nullable: false })
  reactionSummary: Record<string, number>;

  @Column({ type: 'int', default: 0 })
  reactionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastModifiedAt: Date;
}
