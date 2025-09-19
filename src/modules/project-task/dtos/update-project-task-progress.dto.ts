import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class UpdateProjectTaskProgressDto {
  @ApiPropertyOptionalCustom({
    type: Number,
    example: 100,
    description: 'Tiến độ công việc (0-100)',
  })
  progressPercent?: number;

  @ApiPropertyOptionalCustom({
    example: 'Cập nhật tiến độ công việc',
  })
  lastReport?: string;

  @ApiPropertyOptionalCustom({
    type: Number,
    example: 5000,
    description: 'Ngân sách đã sử dụng cho công việc',
  })
  usedBudget?: number;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách file đính kèm trong email',
    type: [AttachmentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  reportAttachments?: AttachmentDto[];
}
