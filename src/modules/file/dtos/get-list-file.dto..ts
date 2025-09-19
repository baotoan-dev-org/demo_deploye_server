import { IntersectionType } from '@nestjs/swagger';
import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { FileStatus } from '../file.enum';
import { IsEnum } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListFileDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ enum: FileStatus })
  @IsEnum(FileStatus)
  status?: FileStatus;
}
