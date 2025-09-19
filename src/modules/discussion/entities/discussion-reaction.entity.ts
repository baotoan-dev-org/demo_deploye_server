import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Discussion } from './discussion.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('discussion_reaction')
export class DiscussionReaction extends BaseEntity {
  @Column({ type: 'varchar', nullable: true })
  type: string;

  @Column({ type: 'uuid' })
  discussionId: string;
  @ManyToOne(() => Discussion, (discussion) => discussion.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discussionId' })
  discussion: Discussion;
}
