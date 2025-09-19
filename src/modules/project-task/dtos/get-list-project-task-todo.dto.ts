import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { GetListProjectTaskDto } from './get-list-project-task.dto';

export class GetListProjectTaskTodoDto extends IntersectionType(
  PartialType(PickType(PageOptionsDto, ['search'])),
  PartialType(PickType(GetListProjectTaskDto, ['displayStatus'])),
) {}
