import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { FileTypeEnum } from '../file.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsBooleanCustom } from '@/common/decorators/is-boolean-custom.decorator';

export class CreateFileDto {
  @ApiProperty({ type: String, format: 'binary' })
  file: Express.Multer.File;

  @ApiProperty({ enum: FileTypeEnum })
  @IsEnum(FileTypeEnum)
  type: FileTypeEnum;

  @ApiPropertyOptionalCustom()
  @IsBooleanCustom()
  isOverwrite?: boolean = false;
// Optional field to read JD from recruitment - client sent context = 'recruitment'
  @ApiPropertyOptionalCustom()
  @IsString()
  context?: string;
}
