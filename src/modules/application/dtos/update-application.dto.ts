import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { ApplicationStatus } from '../application.enum';
import { Type } from 'class-transformer';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { AttachmentDto } from '@/common/dtos/attachment.dto';

export class UpdateApplicationDto {
  @ApiPropertyOptionalCustom({
    default: 'Chưa phù hợp',
    description: 'Lý do từ chối ứng viên',
  })
  @IsString()
  @ValidateIf((o) =>
    [
      ApplicationStatus.NOT_QUALIFIED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.THANK_LETTER,
    ].includes(o.status),
  )
  @IsNotEmpty({ message: 'Lý do từ chối là bắt buộc khi từ chối' })
  rejectReason?: string;

  @ApiProperty({
    enum: ApplicationStatus,
    description: 'Trạng thái đơn ứng tuyển',
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptionalCustom({ description: 'Mẫu email gửi cho ứng viên' })
  @IsString()
  contentEmail?: string;

  @ApiPropertyOptionalCustom({ description: 'Chủ đề email' })
  @IsString()
  subject?: string;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách file đính kèm trong email',
    type: [AttachmentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptionalCustom({ description: 'Danh sách email CC' })
  @IsString({ each: true })
  ccEmails?: string[];

  @ApiPropertyOptionalCustom({ description: 'Danh sách email BCC' })
  @IsString({ each: true })
  bccEmails?: string[];
}
