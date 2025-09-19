import { IntersectionType, PickType } from '@nestjs/swagger';
import { GetProjectTaskDashboardDto } from './get-project-task-dashboard.dto';

export class GetListProjectByDivisionDto extends IntersectionType(
  PickType(GetProjectTaskDashboardDto, ['divisionId'] as const),
) {}
