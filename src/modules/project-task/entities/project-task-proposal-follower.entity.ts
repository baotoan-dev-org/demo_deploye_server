import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';
import { ProjectTaskProposal } from './project-task-proposal.entity';

@Entity({ comment: 'Lưu tình trạng theo dõi của những người theo dõi đối với đề xuất' })
export class ProjectTaskProposalFollower extends BaseEntity {
  @Column({ type: 'uuid', length: 36 })
  proposalId: string;
  @ManyToOne(() => ProjectTaskProposal, (e) => e.projectTaskFollowers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposalId' })
  proposal: ProjectTaskProposal;

  @Column({ type: 'uuid', length: 36, nullable: true })
  followerId: string;
  @ManyToOne(() => User, (e) => e.projectTaskProposalFollowers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerId' })
  follower: User;
}
