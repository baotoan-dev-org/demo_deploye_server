import { PartialType } from '@nestjs/swagger';
import { CreateRoomGroupDto } from './create-room-group.dto';

export class UpdateRoomGroupDto extends PartialType(CreateRoomGroupDto) {}
