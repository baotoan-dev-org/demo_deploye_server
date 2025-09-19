import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class IdUuidDto {
  @ApiProperty()
  @IsUUID()
  id: string;
}
