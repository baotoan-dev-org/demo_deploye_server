import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from '../create-user.dto';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { UserPositionType } from '../../user.enum';

export class CreateUserOrgUnitPositionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orgUnitId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  positionId: string;

  @ApiPropertyOptionalCustom({ example: UserPositionType.SUB })
  @IsEnum(UserPositionType)
  positionType: UserPositionType;
}

export class CreateUserSubManagerDto {
  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orgUnitId: string;

  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orgUnitParentId?: string;
}

export class CreateUserRelationDto extends IntersectionType(CreateUserDto) {
  @ApiPropertyOptional({ type: [CreateUserOrgUnitPositionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateUserOrgUnitPositionDto)
  @IsArray()
  userOrgUnitPositions: CreateUserOrgUnitPositionDto[];

  @ApiPropertyOptionalCustom({ type: [CreateUserSubManagerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserSubManagerDto)
  subManagers?: CreateUserSubManagerDto[] = [];
}
