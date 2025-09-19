import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { PositionSubManager, PositionType } from '../position.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class CreatePositionDto {
  @ApiProperty({ description: 'Tên của vị trí, duy nhất' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'ID của vị trí cha',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  parentId: string;

  @ApiProperty({ enum: PositionType })
  @IsEnum(PositionType)
  type: PositionType;

  @ApiProperty({ enum: PositionSubManager })
  @IsEnum(PositionSubManager)
  subManager: PositionSubManager;

  @ApiPropertyOptionalCustom({ description: 'Mô tả chức vụ' })
  @IsString()
  description?: string;

  @ApiPropertyOptionalCustom({ description: 'Mô tả nhiệm vụ chức vụ' })
  @IsString()
  task?: string;

  @ApiPropertyOptionalCustom({ description: 'Mô tả quyền hạn chức vụ' })
  @IsString()
  authority?: string;
}
