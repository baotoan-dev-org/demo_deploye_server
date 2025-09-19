import { AttachmentStatus } from '@/common/dtos/attachment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export class UpdateStatusBannerDto {
  @ApiProperty({ description: 'index on attachments' })
  @IsNumber()
  index: number;
  
  @ApiProperty({ description: 'status'})
  @IsEnum(AttachmentStatus)
  status: AttachmentStatus
}
