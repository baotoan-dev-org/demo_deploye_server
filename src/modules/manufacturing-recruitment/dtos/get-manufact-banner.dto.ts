import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsEnum } from 'class-validator';
import { ManufactBannerStatus } from '../manufacturing-recruitment.enum';

export class GetListManufactBannerDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'From date to filter tasks (ISO format: yyyy-MM-dd)',
    example: '2023-01-01',
  })
  fromDate?: string;

  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'To date to filter tasks (ISO format: yyyy-MM-dd)',
    example: '2025-12-31',
  })
  toDate?: string;
}
