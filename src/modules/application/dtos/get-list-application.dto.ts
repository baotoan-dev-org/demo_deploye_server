import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { ApplicationStatus } from '../application.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsEnum, IsUUID } from 'class-validator';

export class GetListApplicationDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ description: 'Trạng thái đơn ứng tuyển', enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptionalCustom({ description: 'Id của job' })
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptionalCustom({ description: 'Id của candidate' })
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  orgUnitId?: string;
}
