import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsString } from 'class-validator';

export class GetPositionSearchDto {
  @ApiPropertyOptionalCustom({ description: 'Tên của vị trí' })
  @IsString()
  search: string;
}
