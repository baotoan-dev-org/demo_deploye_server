import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional, IsUUID, IsInt, Min, IsEnum } from 'class-validator';
import { RoomGroupStatus } from '../room.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Phòng họp A', description: 'Tên phòng họp' })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ example: 'uuid-room-group', description: 'ID nhóm phòng họp' })
  @IsUUID()
  roomGroupId: string;

  @ApiPropertyOptionalCustom({
    example: 'Phòng họp lớn, có máy chiếu',
    description: 'Mô tả phòng họp',
    type: String,
  })
  description?: string;

  @ApiProperty({
    example: RoomGroupStatus.ACTIVE,
    enum: RoomGroupStatus,
    description: 'Trạng thái phòng họp',
  })
  @IsEnum(RoomGroupStatus)
  status: RoomGroupStatus;

  @ApiProperty({ example: 10, description: 'Sức chứa phòng họp' })
  @IsInt()
  @Min(1)
  capacity: number;
}
