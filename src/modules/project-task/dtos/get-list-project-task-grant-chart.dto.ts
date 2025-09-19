import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { GetListProjectTaskDto } from './get-list-project-task.dto';

export class GetListProjectTaskGrantChartDto extends IntersectionType(
  PartialType(PickType(GetListProjectTaskDto, ['divisionId', 'search', 'displayStatus', 'type'])),
) {}
