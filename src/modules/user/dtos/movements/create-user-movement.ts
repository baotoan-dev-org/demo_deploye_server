import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UserApproveTransferType, UserMovementType } from '../../user.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { SubManagerValue } from '../../interfaces/movements.interface';

class PositionValueDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  orgName: string;

  @ApiProperty()
  @IsString()
  positionName: string;
}

export class OrgUnitValueDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  orgName: string;

  @ApiProperty()
  @IsString()
  positionName: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  divisionName: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  departmentName: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  partName: string;

  @ApiPropertyOptionalCustom()
  @IsArray()
  @IsString({ each: true })
  teamsName: string[];
}

export class UserValueDto {
  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  code: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  name: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  url: string;
}

export class MovementValueDto {
  @ApiProperty({ type: PositionValueDto })
  @ValidateNested()
  @Type(() => PositionValueDto)
  position: PositionValueDto;

  @ApiProperty({ type: OrgUnitValueDto })
  @ValidateNested()
  @Type(() => OrgUnitValueDto)
  orgUnit: OrgUnitValueDto;

  subManagers?: SubManagerValue[] = [];
}

export class CreateApproversDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  approverId: string;

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiPropertyOptionalCustom({ example: UserApproveTransferType.NEW })
  @IsEnum(UserApproveTransferType)
  transferType: UserApproveTransferType;
}

export class CreateUserSubManagerDto {
  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orgUnitId: string;

  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orgUnitParentId?: string;
}

export class CreateUserMovementDto {
  @ApiProperty({ type: MovementValueDto })
  @ValidateNested()
  @Type(() => MovementValueDto)
  oldValue: MovementValueDto & UserValueDto;

  @ApiProperty({ type: MovementValueDto })
  @ValidateNested()
  @Type(() => MovementValueDto)
  newValue: MovementValueDto;

  @ApiProperty({ example: 'Thăng chức' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Ngày bổ nhiệm', type: String, format: 'date-time' })
  @IsDateString()
  dateAppointment?: string = new Date().toDateString();

  @ApiProperty({ description: 'Loại phân nhiệm', enum: UserMovementType })
  @IsEnum(UserMovementType)
  type?: UserMovementType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ type: [CreateApproversDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateApproversDto)
  @IsArray()
  approvers: CreateApproversDto[];

  @ApiPropertyOptionalCustom({
    description: 'ID của user followers',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  followers?: string[] = [];

  @ApiPropertyOptionalCustom({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  file?: string;

  @ApiPropertyOptionalCustom({ type: [CreateUserSubManagerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserSubManagerDto)
  subManagers?: CreateUserSubManagerDto[] = [];
}
