import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { JobTitleStatus } from '../job-title.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListJobTitleDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({
    description: 'Trạng thái chức danh tuyển dụng',
    enum: JobTitleStatus,
  })
  @IsEnum(JobTitleStatus)
  status?: JobTitleStatus;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  positionId?: string;
}
