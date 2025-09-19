import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { ApplicationStatus } from '../application.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsEnum } from 'class-validator';

export class GetListApplicationMeDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({
    description: 'Trạng thái đơn ứng tuyển',
    enum: ApplicationStatus,
  })
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
