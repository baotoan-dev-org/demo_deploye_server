import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { GetListProjectTaskDto } from './get-list-project-task.dto';
import { ProjectTaskViewType } from '../project-task.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListProjectTasksByDivisionDto extends IntersectionType(
  PartialType(PickType(GetListProjectTaskDto, ['search'])),
) {
  @ApiPropertyOptionalCustom({
    enum: ProjectTaskViewType,
    required: false,
    description: 'Type of project task view to filter (e.g., by division or cross_division)',
    example: ProjectTaskViewType.DIVISION,
  })
  type?: ProjectTaskViewType;
}
