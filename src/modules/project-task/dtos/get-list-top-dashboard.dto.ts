import { IntersectionType, PickType } from '@nestjs/swagger';
import { GetProjectTaskDashboardDto } from './get-project-task-dashboard.dto';
import { PageOptionsDto } from '@/common/dtos/page-options.dto';

export class GetListTopUserAndDepartmentDashboardDto extends IntersectionType(
  GetProjectTaskDashboardDto,
  PickType(PageOptionsDto, ['take', 'search'] as const),
) {}
