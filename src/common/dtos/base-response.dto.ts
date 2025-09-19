import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto {
  @ApiProperty({ default: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ nullable: true, default: '123e4567-e89b-12d3-a456-426614174000' })
  createdById: string | null;

  @ApiProperty({ nullable: true, default: '123e4567-e89b-12d3-a456-426614174000' })
  updatedById: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deletedAt?: Date;
}
