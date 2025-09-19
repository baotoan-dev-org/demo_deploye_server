import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType, OmitType, PartialType } from '@nestjs/swagger';
import { JobStatus, JobTag } from '../job.enum';
import { IsArray, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { GetListJobRecruitmentDto } from './get-list-job-recruitment.dto';

export class GetListJobDto extends IntersectionType(
  PageOptionsDto,
  OmitType(GetListJobRecruitmentDto, ['industryId', 'positionId', 'createdById'])
) {
  @ApiPropertyOptionalCustom({ enum: JobTag })
  @IsEnum(JobTag)
  tag?: JobTag;

  @ApiPropertyOptionalCustom({ enum: JobStatus })
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptionalCustom()
  @IsNumber()
  minSalary?: number;

  @ApiPropertyOptionalCustom()
  @IsNumber()
  maxSalary?: number;

  @ApiPropertyOptionalCustom({ type: [String] })
  @IsArray()
  industryIds?: string[];

  @ApiPropertyOptionalCustom({ type: [String] })
  @IsArray()
  positionIds?: string[];
}
