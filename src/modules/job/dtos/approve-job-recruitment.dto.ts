import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID, ValidateIf } from 'class-validator';
import { JobApproverStatus } from '../job.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class ApproveJobRecruitmentDto {
  @ApiPropertyOptionalCustom({description: 'ID của job approver'})
  @IsUUID()
  id?: string;

  @ApiProperty({ enum: JobApproverStatus, example: JobApproverStatus.APPROVED })
  @IsEnum(JobApproverStatus)
  status: JobApproverStatus;

  @ApiPropertyOptionalCustom({
      description: 'Nhập lý do trong trường hợp từ chối',
      default: 'Lý do từ chối',
    })
  @IsString()
  @ValidateIf((o) => o.status === JobApproverStatus.REJECTED)
  @IsNotEmpty({ message: 'Lý do từ chối là bắt buộc khi từ chối' })
  reasonReject?: string;

  @ApiPropertyOptionalCustom()
  @IsNotEmpty()
  opinion? : string;
}

export class ApproveMultipleJobRecruitmentDto {
  @ApiProperty({
    type: [ApproveJobRecruitmentDto],
  })
  @IsNotEmpty()
  items: ApproveJobRecruitmentDto[];
}

export class ApproveMultipleGroupRequestDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'uuid'},
  })
  @IsUUID('4', { each: true })
  listRequestGroupId: string[];


  @ApiProperty({ enum: JobApproverStatus, example: JobApproverStatus.APPROVED })
  @IsEnum(JobApproverStatus)
  status: JobApproverStatus;

  @ApiPropertyOptionalCustom({
      description: 'Nhập lý do trong trường hợp từ chối',
      default: 'Lý do từ chối',
    })
  @IsString()
  @ValidateIf((o) => o.status === JobApproverStatus.REJECTED)
  @IsNotEmpty({ message: 'Lý do từ chối là bắt buộc khi từ chối' })
  reasonReject?: string;
}
