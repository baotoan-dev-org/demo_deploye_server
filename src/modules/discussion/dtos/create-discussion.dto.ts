import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length, ValidateNested } from 'class-validator';
import { DiscussionTagInfo } from '../interfaces/discussion.interface';
import { Type } from 'class-transformer';
import { DiscussionTagType, DiscussionType } from '../discussion.enum';
import { AttachmentDto } from '@/common/dtos/attachment.dto';

export class CreateDiscussionDto {
  @ApiProperty({
    example: 'b7e2d7e2-1234-4cde-8a2b-123456789abc',
    description: 'ID dự án cha (nếu có)',
  })
  @IsString()
  @Length(36, 36, { message: 'entityId phải là UUID 36 ký tự' })
  entityId: string;

  @ApiProperty({
    example: 'Thảo luận về dự án A',
  })
  @IsString()
  content: string;

  @ApiPropertyOptionalCustom({
    type: 'string',
    example: 'b7e2d7e2-1234-4cde-8a2b-123456789abc',
    description: 'ID bình luận cha (nếu có)',
  })
  parentDiscussionId?: string;

  @ApiPropertyOptionalCustom({
    type: 'array',
    description: 'Danh sách tag user trong thảo luận',
    example: [
      { userId: 'user-id', type: DiscussionTagType.USER, index: 6, length: 7 },
      { type: DiscussionTagType.ALL, index: 20, length: 4 },
    ],
  })
  @Type(() => DiscussionTagInfo)
  discussionTags?: DiscussionTagInfo[];

  @ApiProperty({
    enum: DiscussionType,
    example: DiscussionType.PROJECT_TASK,
    description: 'Loại thảo luận',
  })
  @IsEnum(DiscussionType)
  type?: DiscussionType;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách file đính kèm',
    type: [AttachmentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
