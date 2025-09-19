import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FileTypeEnum } from '../file.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsBooleanCustom } from '@/common/decorators/is-boolean-custom.decorator';

export class CreateManyFilesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Select multiple files to upload',
  })
  files: Express.Multer.File[];

  @ApiPropertyOptionalCustom({
    enum: FileTypeEnum,
    description: 'Type of files being uploaded',
  })
  type?: FileTypeEnum;

  @ApiPropertyOptionalCustom({
    description: 'Whether to overwrite existing files with same name',
  })
  @IsBooleanCustom()
  @IsOptional()
  isOverwrite?: boolean = false;
}
