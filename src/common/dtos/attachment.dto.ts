import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptionalCustom } from '../decorators/api-property-optional-custom.decorator';

export enum AttachmentStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}
export class AttachmentDto {
  @ApiProperty({
    example: 'https://example.com/file.pdf',
    description: 'URL hoặc ID của tệp đính kèm',
  })
  @IsString()
  url: string;

  @ApiProperty({ example: 'file.pdf', description: 'Tên tệp đính kèm' })
  @IsString()
  name: string;

  @ApiPropertyOptionalCustom({ example: 'Active', description: 'Trạng thái của tệp đính kèm', default: AttachmentStatus.ACTIVE, enum: AttachmentStatus  })
  @IsEnum(AttachmentStatus)
  status?: AttachmentStatus = AttachmentStatus.ACTIVE;
}
