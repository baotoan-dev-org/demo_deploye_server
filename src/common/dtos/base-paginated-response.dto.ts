import { ApiProperty } from '@nestjs/swagger';

export class BasePaginatedResponseDto<T> {
  @ApiProperty()
  page: number;

  @ApiProperty()
  take: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ isArray: true })
  list: T[];
}
