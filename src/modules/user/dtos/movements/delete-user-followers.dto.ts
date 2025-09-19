import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteUserFollowersDto {
  @ApiProperty({ description: 'ID của user' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'ID của user movement' })
  @IsNotEmpty()
  @IsUUID()
  userMovementId: string;
}
