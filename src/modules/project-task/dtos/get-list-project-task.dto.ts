import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { ProjectTaskDisplayStatus, ProjectTaskViewType } from '../project-task.enum';

export class GetListProjectTaskDto extends IntersectionType(
  PartialType(PickType(PageOptionsDto, ['search', 'orderBy', 'order'])),
) {
  @ApiPropertyOptionalCustom({
    description: 'Filter by display status of the project task',
    enum: ProjectTaskDisplayStatus,
    example: ProjectTaskDisplayStatus.IN_PROGRESS,
  })
  displayStatus?: ProjectTaskDisplayStatus;

  @ApiPropertyOptionalCustom({
    description: 'Filter by project task IDs',
    type: [String],
    example: ['task1', 'task2'],
  })
  projectTaskIds?: string[];

  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'From date to filter tasks (ISO format: yyyy-MM-dd)',
    example: '2023-01-01',
  })
  fromDate?: string;

  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'To date to filter tasks (ISO format: yyyy-MM-dd)',
    example: '2025-12-31',
  })
  toDate?: string;

  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'Division ID to filter tasks',
    example: '2134f5e-1234-4cde-8a2b-123456789abc',
  })
  divisionId?: string;

  @ApiPropertyOptionalCustom({
    enum: ProjectTaskViewType,
    required: false,
    description: 'Type of project task view to filter (e.g., by division or cross_division)',
    example: ProjectTaskViewType.DIVISION,
  })
  type?: ProjectTaskViewType;
}
