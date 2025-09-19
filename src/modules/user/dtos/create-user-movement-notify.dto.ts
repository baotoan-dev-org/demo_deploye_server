import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateUserMovementNotifyDto {
  @ApiProperty({ type: String, format: 'uuid', description: 'ID của userMovement' })
  @IsUUID('4')
  userMovementId: string;

  @ApiProperty({ type: [String], format: 'uuid', description: 'Danh sách userId nhận notify' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  userIds: string[];
}
