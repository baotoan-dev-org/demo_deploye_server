import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListApproverDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  oldOrgUnitId?: string;

  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId?: string;

  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  managerId?: string;
}
