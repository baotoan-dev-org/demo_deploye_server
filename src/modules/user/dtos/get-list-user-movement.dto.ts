import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsArray, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { UserMovementSearchType, UserMovementStatus, UserMovementType } from '../user.enum';

export class GetListUserMovementDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ enum: UserMovementStatus })
  @IsEnum(UserMovementStatus)
  status?: UserMovementStatus;

  @ApiPropertyOptionalCustom({ enum: UserMovementStatus })
  @IsEnum(UserMovementStatus)
  statusMovement?: UserMovementStatus;

  @ApiPropertyOptionalCustom({ enum: UserMovementType })
  @IsEnum(UserMovementType)
  type: UserMovementType;

  @ApiPropertyOptionalCustom({ enum: UserMovementSearchType })
  @IsEnum(UserMovementSearchType)
  searchType: UserMovementSearchType;

  @ApiPropertyOptionalCustom({ type: [String], example: ['123e4567-e89b-12d3-a456-426614174000'] })
  @IsArray()
  @IsUUID('4', { each: true })
  orgUnitIds?: string[] = [];

  @ApiPropertyOptionalCustom({ type: String, example: '2025-01-01' })
  @IsDateString()
  dateAppointmentFrom?: string;

  @ApiPropertyOptionalCustom({ type: String, example: '2025-01-02' })
  @IsDateString()
  dateAppointmentTo?: string;

  @ApiPropertyOptionalCustom({ type: String, example: '2025-01-01' })
  @IsDateString()
  createdAtFrom?: string;

  @ApiPropertyOptionalCustom({ type: String, example: '2025-01-02' })
  @IsDateString()
  createdAtTo?: string;
}
