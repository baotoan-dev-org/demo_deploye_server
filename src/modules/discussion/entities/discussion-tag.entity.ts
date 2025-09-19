import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Discussion } from './discussion.entity';
import { DiscussionTagType } from '../discussion.enum';

@Entity()
export class DiscussionTag extends BaseEntity {
  @Column({ type: 'uuid' })
  discussionId: string;
  @ManyToOne(() => Discussion, (discussion) => discussion.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discussionId' })
  discussion: Discussion;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;
  @ManyToOne(() => User, (user) => user.id, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'enum', enum: DiscussionTagType, default: DiscussionTagType.ALL })
  type: DiscussionTagType;

  @Column({ type: 'int' })
  index: number;

  @Column({ type: 'int' })
  length: number;
}
