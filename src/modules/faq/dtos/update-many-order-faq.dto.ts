import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';

export class UpdateOrderFaqDto {
  @ApiProperty()
  @IsUUID()
  faqId: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', example: 1 })
  @IsNumber()
  order: number;
}

export class UpdateManyOrderFaqDto {
  @ApiProperty({ type: [UpdateOrderFaqDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderFaqDto)
  @IsArray()
  faqs: UpdateOrderFaqDto[];
}
