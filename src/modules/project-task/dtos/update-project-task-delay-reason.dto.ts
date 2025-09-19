import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsString } from 'class-validator';

export class UpdateProjectTaskDelayReasonDto {
  @ApiPropertyOptionalCustom({
    description: 'Lý do trễ hạn',
    example: ['Thiếu nhân lực', 'Thiếu tài nguyên'],
    type: [String],
  })
  @IsString({ each: true })
  delayReasons?: string[];
}
