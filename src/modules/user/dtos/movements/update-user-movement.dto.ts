import { PickType } from '@nestjs/swagger';
import { CreateUserMovementDto } from './create-user-movement';

export class UpdateUserMovementDto extends PickType(CreateUserMovementDto, [
  'dateAppointment',
  'file',
  'reason',
] as const) {}
