import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OrgUnitType } from '../org-unit.enum';
import { Type } from 'class-transformer';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class CreateTeamUserDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class CreateOrgUnitDto {
  @ApiProperty({ description: 'Tên đơn vị', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptionalCustom({ description: 'Mô tả', maxLength: 1000 })
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Loại đơn vị', enum: OrgUnitType })
  @IsEnum(OrgUnitType)
  type: OrgUnitType;

  @ApiPropertyOptionalCustom({ description: 'ID đơn vị cha' })
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptionalCustom({ description: 'ID người quản lý' })
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptionalCustom({ type: [CreateTeamUserDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateTeamUserDto)
  @IsArray()
  teamUsers: CreateTeamUserDto[];
}
