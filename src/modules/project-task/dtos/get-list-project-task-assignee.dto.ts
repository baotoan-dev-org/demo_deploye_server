import { IntersectionType, PartialType } from '@nestjs/swagger';
import { GetListProjectTaskTodoDto } from './get-list-project-task-todo.dto';

export class GetListProjectTaskAssigneeDto extends IntersectionType(
  PartialType(GetListProjectTaskTodoDto),
) {}
