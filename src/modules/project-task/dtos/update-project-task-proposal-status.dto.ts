import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptionalCustom } from 'src/common/decorators/api-property-optional-custom.decorator';
import { ProjectTaskProposalStatus } from '../project-task.enum';

export class UpdateProjectTaskProposalStatusDto {
  @ApiProperty({ enum: ProjectTaskProposalStatus, example: ProjectTaskProposalStatus.PENDING })
  @IsEnum(ProjectTaskProposalStatus)
  status: ProjectTaskProposalStatus;

  @ApiPropertyOptionalCustom({ description: 'Lý do từ chối đề xuất' })
  @IsString()
  reasonReject?: string;
}
