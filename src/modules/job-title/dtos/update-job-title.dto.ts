import { PartialType } from '@nestjs/swagger';
import { CreateJobTitleDto } from './create-job-title.dto';
import { IsEnum } from 'class-validator';
import { JobTitleStatus } from '../job-title.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class UpdateJobTitleDto extends PartialType(CreateJobTitleDto) {
  @ApiPropertyOptionalCustom({ enum: JobTitleStatus })
  @IsEnum(JobTitleStatus)
  status?: JobTitleStatus;
}
