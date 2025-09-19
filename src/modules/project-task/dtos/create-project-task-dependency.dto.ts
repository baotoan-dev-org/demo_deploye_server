import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateProjectTaskDependencyDto {
  @ApiProperty({ example: 'uuid-task-id', description: 'ID của task cần tạo dependency' })
  @IsUUID()
  projectTaskId: string;

  @ApiProperty({
    example: ['uuid-depends-on-task-id-1', 'uuid-depends-on-task-id-2'],
    description: 'Danh sách ID của các task mà task này phụ thuộc',
    type: [String],
  })
  @IsUUID('all', { each: true })
  dependsOnTaskIds: string[];
}
