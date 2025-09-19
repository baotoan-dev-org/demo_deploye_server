import { ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { CreateProjectTaskDto } from './create-project-task.dto';
import { IsString, Length } from 'class-validator';

export class CreateProjectTaskAssigneeDto extends IntersectionType(
  PartialType(PickType(CreateProjectTaskDto, ['orgUnitIds'])),
) {
  @ApiProperty({
    example: 'b7e2d7e2-1234-4cde-8a2b-123456789abc',
    description: 'ID dự án cha (nếu có)',
  })
  @IsString()
  @Length(36, 36, { message: 'projectTaskId phải là UUID 36 ký tự' })
  projectTaskId: string;
}
