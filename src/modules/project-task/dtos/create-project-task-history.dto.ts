import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ProjectTaskHistoryAction, ProjectTaskType } from '../project-task.enum';

export class CreateProjectTaskHistoryDto {
  @ApiProperty({ type: Object, description: 'Dữ liệu cũ trước khi cập nhật' })
  oldData: Object;

  @ApiProperty({ type: Object, description: 'Dữ liệu mới sau khi cập nhật' })
  newData: Object;

  @ApiProperty({ enum: ProjectTaskType })
  @IsEnum(ProjectTaskType)
  type: ProjectTaskType;

  @ApiProperty({ enum: ProjectTaskHistoryAction })
  @IsEnum(ProjectTaskHistoryAction)
  action: ProjectTaskHistoryAction;

  @ApiProperty({
    description: 'ID của thực thể liên quan (ví dụ: project task ID)',
  })
  @IsString()
  projectTaskId: string;
}
