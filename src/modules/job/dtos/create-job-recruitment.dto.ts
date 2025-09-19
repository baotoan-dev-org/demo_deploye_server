import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { JobPriority, JobType, RecruitmentReason, WorkArea } from '../job.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { Type } from 'class-transformer';

export class CreateJobRecruitmentDto {

  @ApiProperty({ enum: JobType, example: JobType.FULLTIME })
  @IsEnum(JobType)
  type: JobType;

  @ApiProperty({ example: 2 })
  @IsNumber()
  experienceNumber: number;

  @ApiProperty({ example: new Date(), description: 'Ngày mong đợi onboard' })
  @IsDate()
  expectedOnboardDate?: Date;

  @ApiProperty({ enum: JobPriority, example: JobPriority.NORMAL })
  @IsEnum(JobPriority)
  priority: JobPriority;

  @ApiProperty({ enum: RecruitmentReason, example: RecruitmentReason.NEW_HIRE })
  @IsEnum(RecruitmentReason)
  recruitmentReason: RecruitmentReason;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách file đính kèm trong yêu cầu đăng tuyển',
    type: [AttachmentDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiProperty({ example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ enum: WorkArea, example: WorkArea.OFFICE })
  @IsEnum(WorkArea)
  address: WorkArea;

  @ApiProperty()
  @IsUUID()
  orgUnitId: string;

  @ApiProperty()
  @IsUUID()
  positionId: string;

  @ApiProperty()
  @IsUUID()
  jobTitleId: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  note?: string;

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

export class CreateManyJobRecruitmentDto {
  @ApiProperty({
    type: [CreateJobRecruitmentDto],
    description: 'Danh sách job recruitment cần tạo',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateJobRecruitmentDto)
  @IsArray()
  data: CreateJobRecruitmentDto[];
}
