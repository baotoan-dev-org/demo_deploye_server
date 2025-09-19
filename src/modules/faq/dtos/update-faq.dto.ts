import { PartialType } from '@nestjs/swagger';
import { CreateFaqDto } from './create-faq.dto';
import { IsEnum } from 'class-validator';
import { FaqCategory, FaqStatus } from '../faq.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class UpdateFaqDto extends PartialType(CreateFaqDto) {
  @ApiPropertyOptionalCustom({
    enum: FaqStatus,
    description: 'Trạng thái câu hỏi',
  })
  @IsEnum(FaqStatus)
  status?: FaqStatus;

  @ApiPropertyOptionalCustom({
    enum: FaqCategory,
    description: 'Danh mục câu hỏi',
  })
  @IsEnum(FaqCategory)
  category?: FaqCategory;
}
