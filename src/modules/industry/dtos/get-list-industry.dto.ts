import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IndustryStatus } from '../industry.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListIndustryDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({
    description: 'Trạng thái ngành nghề',
    enum: IndustryStatus,
  })
  @IsEnum(IndustryStatus)
  status?: IndustryStatus;
}
