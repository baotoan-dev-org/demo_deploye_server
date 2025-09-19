import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { RoomGroupStatus } from '../room.enum';

export class GetListRoomGroupDto extends PageOptionsDto {
  @ApiPropertyOptionalCustom({
    description: 'Filter by status of the room group',
    enum: RoomGroupStatus,
    example: RoomGroupStatus.ACTIVE,
  })
  status: RoomGroupStatus;
}
