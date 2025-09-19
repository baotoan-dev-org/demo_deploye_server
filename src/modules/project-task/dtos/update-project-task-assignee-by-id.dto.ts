import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateProjectTaskAssigneeByIdDto {
  @ApiProperty({
    description: 'The ID of the old user to be replaced',
    example: 'old-user-uuid',
  })
  @IsUUID()
  oldUserId: string;

  @ApiProperty({
    description: 'The ID of the new user to replace the old user',
    example: 'new-user-uuid',
  })
  @IsUUID()
  replacementUserId: string;
}
