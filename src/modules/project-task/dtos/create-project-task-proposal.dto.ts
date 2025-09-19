import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, Length, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiPropertyOptionalCustom } from 'src/common/decorators/api-property-optional-custom.decorator';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { Type } from 'class-transformer';
import { ProjectTaskProposalType } from '../project-task.enum';

export class CreateProjectTaskProposalDto {
  @ApiProperty({
    description: 'Tiêu đề của đề xuất',
    example: 'Đề xuất gia hạn thời gian hoàn thành',
  })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiProperty({ enum: ProjectTaskProposalType, example: ProjectTaskProposalType.OTHER })
  @IsEnum(ProjectTaskProposalType)
  type: ProjectTaskProposalType;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  projectTaskId?: string;

  @ApiPropertyOptionalCustom({
    type: 'number',
    example: 1000000,
    description: 'Amount of budget requested for the proposal',
    minimum: 0,
  })
  amount?: number;

  @ApiPropertyOptionalCustom({ description: 'Đơn vị tiền tệ của ngân sách (VD: VND, USD, EUR)' })
  @IsString()
  currency?: string;

  @ApiPropertyOptionalCustom({
    example: '2025-07-01T00:00:00.000Z',
    description: 'Old end date (ISO string)',
  })
  @IsString()
  oldEndDate?: string;

  @ApiPropertyOptionalCustom({
    example: '2025-07-15T00:00:00.000Z',
    description: 'Old estimate date (ISO string)',
  })
  @IsString()
  oldEstimateDate?: string;

  @ApiPropertyOptionalCustom({
    example: '2025-07-01T00:00:00.000Z',
    description: 'New end date (ISO string)',
  })
  @IsString()
  newEndDate?: string;

  @ApiPropertyOptionalCustom({
    example: '2025-07-15T00:00:00.000Z',
    description: 'New estimate date (ISO string)',
  })
  @IsString()
  newEstimateDate?: string;

  @ApiPropertyOptionalCustom({
    example: ['old-user-uuid-1', 'old-user-uuid-2'],
    description: 'Old assignee user IDs',
    type: [String],
  })
  @IsUUID('4', { each: true })
  oldUserIds?: string[];

  @ApiPropertyOptionalCustom({
    example: ['new-user-uuid-1', 'new-user-uuid-2'],
    description: 'New assignee user IDs',
    type: [String],
  })
  @IsUUID('4', { each: true })
  replacementUserIds?: string[];

  @ApiPropertyOptionalCustom({
    example: ['old-org-unit-uuid-1', 'old-org-unit-uuid-2'],
    description: 'Old assignee organization unit IDs',
    type: [String],
  })
  @IsUUID('4', { each: true })
  oldOrgUnit?: string[];

  @ApiPropertyOptionalCustom({
    example: ['new-org-unit-uuid-1', 'new-org-unit-uuid-2'],
    description: 'New assignee organization unit IDs',
    type: [String],
  })
  @IsUUID('4', { each: true })
  newOrgUnit?: string[];

  @ApiPropertyOptionalCustom({ description: 'Lý do tạo đề xuất' })
  @IsString()
  reason?: string;

  @ApiPropertyOptionalCustom({
    description: 'Lý do trễ hạn',
    example: ['Thiếu nhân lực', 'Thiếu tài nguyên'],
    type: [String],
  })
  @IsString({ each: true })
  delayReasons?: string[];

  @ApiPropertyOptionalCustom({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    description: 'List of approver user IDs (at least 1 required)',
  })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  approverIds: string[];

  @ApiPropertyOptionalCustom({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    description: 'List of follower user IDs (optional)',
  })
  @IsUUID('4', { each: true })
  followerIds?: string[];

  @ApiPropertyOptionalCustom({
    type: 'integer',
    example: 0,
    description: 'Progress at the time of proposal request (0-100)',
    minimum: 0,
    maximum: 100,
  })
  progressAtRequest?: number;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách file đính kèm trong email',
    type: [AttachmentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
