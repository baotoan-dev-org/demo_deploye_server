import { GetListProjectTaskDto } from './get-list-project-task.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { GetListPercentAndUserImplementTaskDashboardDto } from './get-list-percent-task-dashboard.dto';

export class GetListTaskDetailOfProjectDashboardDto extends IntersectionType(
  PartialType(PickType(GetListProjectTaskDto, ['search', 'fromDate', 'toDate'])),
  PartialType(PickType(GetListPercentAndUserImplementTaskDashboardDto, ['projectTaskIds'])),
) {}
