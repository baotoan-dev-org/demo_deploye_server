import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsArray, IsEnum, ValidateNested, IsUUID } from 'class-validator';
import { ApiPropertyOptionalCustom } from 'src/common/decorators/api-property-optional-custom.decorator';
import { ProjectTaskStatus, ProjectTaskType } from '../project-task.enum';
import { ProjectTaskPriority } from '../project-task.enum';
import { Type } from 'class-transformer';

export class CreateProjectTaskDto {
  @ApiProperty({ example: 'Dự án A', description: 'Tên dự án' })
  @IsString()
  @Length(1, 255, { message: 'Tên dự án phải chứa ít nhất 1 ký tự' })
  name: string;

  @ApiProperty({ enum: ProjectTaskType })
  @IsEnum(ProjectTaskType)
  type: ProjectTaskType;

  @ApiProperty({ enum: ProjectTaskStatus })
  @IsEnum(ProjectTaskStatus)
  status: ProjectTaskStatus;

  @ApiPropertyOptionalCustom({ example: 'Mô tả dự án', description: 'Mô tả dự án' })
  @IsString()
  description?: string;

  @ApiPropertyOptionalCustom({ example: 1000000, description: 'Ngân sách dự án' })
  budget?: number;

  @ApiPropertyOptionalCustom({
    example: 'b7e2d7e2-1234-4cde-8a2b-123456789abc',
    description: 'ID dự án cha (nếu có)',
  })
  @IsString()
  @Length(36, 36, { message: 'parentId phải là UUID 36 ký tự' })
  parentId?: string;

  @ApiPropertyOptionalCustom({ example: '2024-06-01', description: 'Ngày bắt đầu' })
  // @IsDate()
  // @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptionalCustom({ example: '2024-12-31', description: 'Ngày kết thúc' })
  // @IsDate()
  // @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptionalCustom({ example: '2024-10-01', description: 'Ngày ước tính hoàn thành' })
  // @IsDate()
  // @Type(() => Date)
  estimateDate?: Date;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách file đính kèm trong email',
    type: [AttachmentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptionalCustom({
    example: ['b7e2d7e2-1234-4cde-8a2b-123456789abc'],
    description: 'ID người quản lý (nếu có)',
    type: [String],
  })
  // @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptionalCustom({
    example: ['b7e2d7e2-1234-4cde-8a2b-123456789abc'],
    description: 'ID tổ chức (nếu có)',
    type: [String],
  })
  // @ArrayMinSize(1)
  @IsString({ each: true })
  orgUnitIds: string[];

  @ApiPropertyOptionalCustom({
    example: ['uuid-task-depends-1', 'uuid-task-depends-2'],
    description: 'Danh sách ID các công việc mà công việc này phụ thuộc',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  dependsOnTaskIds?: string[];

  @ApiPropertyOptionalCustom({
    description: 'Tiêu đề của đề xuất',
    example: 'Đề xuất gia hạn thời gian hoàn thành',
  })
  title?: string;

  @ApiPropertyOptionalCustom({
    type: 'number',
    example: 1000000,
    description: 'Amount of budget requested for the proposal',
    minimum: 0,
  })
  amount?: number;

  @ApiPropertyOptionalCustom({
    description: 'Lý do tạo đề xuất',
    example: 'Cần thêm thời gian để hoàn thành công việc',
  })
  @IsString()
  reason?: string;

  @ApiPropertyOptionalCustom({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    description: 'List of approver user IDs (at least 1 required)',
  })
  @IsUUID('4', { each: true })
  approverIds?: string[];

  // follower của proposal
  @ApiPropertyOptionalCustom({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    description: 'List of follower user IDs (at least 1 required)',
  })
  @IsUUID('4', { each: true })
  followerIds?: string[];

  @ApiPropertyOptionalCustom({ example: 0.5, description: 'Tỉ trọng của dự án/task', minimum: 0 })
  weight?: number;

  @ApiPropertyOptionalCustom({
    enum: ProjectTaskPriority,
    example: ProjectTaskPriority.NORMAL,
    description: 'Mức độ ưu tiên của dự án/task',
  })
  @IsEnum(ProjectTaskPriority)
  priority?: ProjectTaskPriority;

  @ApiPropertyOptionalCustom({
    type: String,
    example: 'VND',
    description: 'Đơn vị tiền tệ của ngân sách (VD: VND, USD, EUR)',
  })
  currency?: string;

  // follower của project task
  @ApiPropertyOptionalCustom({
    description: 'ID của user followers',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  followers?: string[] = [];

  @ApiPropertyOptionalCustom({
    type: Number,
    example: 23000,
    description: 'Tỉ giá của đơn vị tiền tệ tại thời điểm tạo task',
  })
  exchangeRate?: number;

  @ApiPropertyOptionalCustom({
    type: Number,
    example: 1000000,
    description: 'Ngân sách của dự án (đã quy đổi sang đơn vị tiền tệ đã chọn)',
  })
  currencyBudget?: number;
}
