import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddUserFollowersDto {
  @ApiProperty({ description: 'Danh sách id của user' })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  userIds?: string[] = [];

  @ApiProperty({ description: 'ID của user movement' })
  @IsNotEmpty()
  @IsUUID()
  userMovementId: string;
}
