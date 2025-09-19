import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptionalCustom } from 'src/common/decorators/api-property-optional-custom.decorator';
import {
  ProjectTaskProposalType,
  ProjectTaskProposalStatus,
  ProjectTaskProposalFilterType,
} from '../project-task.enum';

export class GetListProjectTaskProposalDto extends IntersectionType(PageOptionsDto) {
  // Loại đề xuất
  @ApiPropertyOptionalCustom({
    enum: ProjectTaskProposalType,
    example: ProjectTaskProposalType.EXTEND_DEADLINE,
  })
  @IsEnum(ProjectTaskProposalType)
  type?: ProjectTaskProposalType;

  @ApiPropertyOptionalCustom({ enum: ProjectTaskProposalStatus })
  @IsEnum(ProjectTaskProposalStatus)
  status?: ProjectTaskProposalStatus;

  @ApiPropertyOptionalCustom({
    enum: ProjectTaskProposalFilterType,
    example: ProjectTaskProposalFilterType.ALL,
  })
  @IsEnum(ProjectTaskProposalFilterType)
  @IsOptional()
  searchType?: ProjectTaskProposalFilterType;
}
