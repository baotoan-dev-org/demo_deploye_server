import { PartialType } from '@nestjs/swagger';
import { CreateIndustryDto } from './create-industry.dto';
import { IsEnum } from 'class-validator';
import { IndustryStatus } from '../industry.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class UpdateIndustryDto extends PartialType(CreateIndustryDto) {
  @ApiPropertyOptionalCustom({ enum: IndustryStatus })
  @IsEnum(IndustryStatus)
  status?: IndustryStatus;
}
