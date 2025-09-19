import { IntersectionType, PickType } from '@nestjs/swagger';
import { CreateProjectTaskProposalDto } from './create-project-task-proposal.dto';

export class AttachFollowerDto extends IntersectionType(
  PickType(CreateProjectTaskProposalDto, ['followerIds'] as const),
) {}
