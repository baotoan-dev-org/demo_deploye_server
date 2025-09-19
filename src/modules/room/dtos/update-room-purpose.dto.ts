import { PartialType } from '@nestjs/swagger';
import { CreateRoomPurposeDto } from './create-room-purpose.dto';

export class UpdateRoomPurposeDto extends PartialType(CreateRoomPurposeDto) {}
