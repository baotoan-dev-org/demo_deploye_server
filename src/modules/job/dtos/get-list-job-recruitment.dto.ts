import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { JobPriority, JobStatus, JobType } from '../job.enum';
import { IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListJobRecruitmentDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ enum: JobType })
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptionalCustom({ enum: JobPriority })
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @ApiPropertyOptionalCustom({ enum: JobStatus })
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  industryId?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  positionId?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  createdById?: string;
}
