import { ApiProperty } from '@nestjs/swagger';

export class BaseModifyResponseDto {
  @ApiProperty()
  success: boolean;
}
