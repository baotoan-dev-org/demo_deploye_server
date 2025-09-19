import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';

export class CreateJobTitleDto {
  @ApiProperty({ description: 'Tên chức danh tuyển dụng', example: 'Trưởng phòng phát triển phần mềm' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUUID()
  orgUnitId: string;

  @ApiProperty()
  @IsUUID()
  positionId: string;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách file đính kèm trong yêu cầu đăng tuyển',
    type: [AttachmentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptionalCustom({ example: '<p>Mô tả công việc...</p>' })
  @IsString()
  description: string;

  @ApiPropertyOptionalCustom({ example: '<ul><li>Yêu cầu 1</li></ul>' })
  @IsString()
  requirement: string;

  @ApiPropertyOptionalCustom({ example: '<ul><li>Phúc lợi 1</li></ul>' })
  @IsString()
  welfare: string;
}
