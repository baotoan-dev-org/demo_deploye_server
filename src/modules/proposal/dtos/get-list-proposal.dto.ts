import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { ProposalRequestType, ProposalSearchType, ProposalType } from '../proposal.enum';
import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { ProjectTaskProposalStatus } from '@/modules/project-task/project-task.enum';
import { UserMovementStatus } from '@/modules/user/user.enum';
import { IsEnum, IsNumber } from 'class-validator';
import { JobApproverStatus } from '@/modules/job/job.enum';

export class GetListProposalDto extends IntersectionType(PageOptionsDto) {
  @ApiProperty({
    description: 'Type of proposal to filter (e.g., project_proposal)',
    example: ProposalType.PROJECT_PROPOSAL,
  })
  @IsEnum(ProposalType)
  type?: ProposalType;

  @ApiPropertyOptionalCustom({
    enum: ProposalSearchType,
    description: 'Search type of proposal (e.g., project_task)',
    example: ProposalSearchType.MY_PROPOSAL,
  })
  searchType?: ProposalSearchType;

  @ApiPropertyOptionalCustom({
    enum: ProposalRequestType,
    description: 'Request type of proposal (e.g., project_task)',
    example: ProposalRequestType.OTHER,
  })
  requestType?: ProposalRequestType;

  @ApiPropertyOptionalCustom({
    enum: [
      ...Object.values(ProjectTaskProposalStatus),
      ...Object.values(UserMovementStatus),
      ...Object.values(JobApproverStatus),
    ],
    description: 'Search type of proposal (e.g., project_task)',
    example: ProjectTaskProposalStatus.PENDING,
  })
  status?: ProjectTaskProposalStatus | UserMovementStatus | JobApproverStatus;
}
