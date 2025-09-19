import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { PositionStatus } from '../position.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListPositionDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ description: 'Trạng thái vị trí', enum: PositionStatus })
  @IsEnum(PositionStatus)
  status?: PositionStatus;

  @ApiPropertyOptionalCustom({
    description: 'lấy danh sách đơn vị đã xóa',
  })
  @IsBoolean()
  withDeleted?: boolean = false;
}
