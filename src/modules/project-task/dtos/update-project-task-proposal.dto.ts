import { PartialType } from '@nestjs/swagger';
import { CreateProjectTaskProposalDto } from './create-project-task-proposal.dto';

export class UpdateProjectTaskProposalDto extends PartialType(CreateProjectTaskProposalDto) {}
