import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { RoomGroupStatus } from '../room.enum';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';

export class GetListRoomDto extends IntersectionType(
  PartialType(PickType(CreateRoomDto, ['roomGroupId'])),
  PageOptionsDto,
) {
  @ApiPropertyOptionalCustom({
    description: 'Filter by status of the room',
    enum: RoomGroupStatus,
    example: RoomGroupStatus.ACTIVE,
  })
  status: RoomGroupStatus;
}
