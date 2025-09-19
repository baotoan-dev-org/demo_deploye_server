import { IsDateSetEndTime, IsDateSetStartTime } from '@/common/decorators/date.decorator';
import { IsStringNotEmpty } from '@/common/decorators/is-string-not-empty.decorator';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class CreateManufactBannerDto {
  @ApiProperty({ description: 'Tên chương trình tuyển dụng', example: 'Tuyển dụng công nhân sản xuẩt' })
  @IsStringNotEmpty()
  name: string;

  @ApiProperty({type: 'string', description: 'Ngày bắt đầu', example: '2024-01-01' })
  @IsDateSetStartTime()
  startDate: Date;

  @ApiProperty({ description: 'Ngày kết thúc', example: '2024-12-31' })
  @IsDateSetEndTime()
  endDate: Date;

  @ApiProperty({
    description: 'Danh sách link banner',
    type: [AttachmentDto]
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
