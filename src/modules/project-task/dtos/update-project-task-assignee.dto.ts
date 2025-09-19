import { PartialType } from '@nestjs/swagger';
import { CreateProjectTaskAssigneeDto } from './create-project-task-assignee.dto';

export class UpdateProjectTaskAssigneeDto extends PartialType(CreateProjectTaskAssigneeDto) {}
