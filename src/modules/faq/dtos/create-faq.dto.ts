import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsStringNotEmpty } from '@/common/decorators/is-string-not-empty.decorator';
import { FaqCategory } from '../faq.enum';

export class CreateFaqDto {
  @ApiProperty({ description: 'Câu hỏi', example: 'Câu hỏi 1' })
  @IsStringNotEmpty()
  question: string;

  @ApiProperty({ description: 'Câu trả lời', example: 'Câu trả lời 1' })
  @IsStringNotEmpty()
  answer: string;

  @ApiPropertyOptionalCustom({ description: 'Ghi chú', example: 'Ghi chú 1' })
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', example: 1 })
  @IsNumber()
  order: number;

  @ApiProperty({  description: 'Danh mục câu hỏi'})
  @IsEnum(FaqCategory)
  category: FaqCategory
}
