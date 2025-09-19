import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsEnum, IsUUID } from 'class-validator';
import { ManufacturingRecruitmentStatus } from '../manufacturing-recruitment.enum';

export class GetListManufacturingRecruitmentDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ description: 'Trạng thái đơn ứng tuyển', enum: ManufacturingRecruitmentStatus })
  @IsEnum(ManufacturingRecruitmentStatus)
  status?: ManufacturingRecruitmentStatus;

  @ApiPropertyOptionalCustom({ description: 'Id của của chương trình tuyển dụng' })
  @IsUUID()
  bannerId?: string;
}
