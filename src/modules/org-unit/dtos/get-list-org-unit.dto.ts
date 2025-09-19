import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, IsUUID } from 'class-validator';
import { OrgUnitStatus, OrgUnitType } from '../org-unit.enum';

export class GetListOrgUnitDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom()
  @IsString()
  name: string;

  @ApiPropertyOptionalCustom({ description: 'Loại đơn vị', enum: OrgUnitType })
  @IsEnum(OrgUnitType)
  type: OrgUnitType;

  @ApiPropertyOptionalCustom({ description: 'Trạng thái', enum: OrgUnitStatus })
  @IsEnum(OrgUnitStatus)
  status: OrgUnitStatus;

  @ApiPropertyOptionalCustom({ description: 'ID đơn vị cha' })
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptionalCustom({
    description: 'Dùng trong trường hợp gọi để tạo chức danh tuyển dụng',
    example: 'JobTitle',
  })
  @IsString()
  context?: string;

  @ApiPropertyOptionalCustom({
    description: 'lấy danh sách đơn vị đã xóa',
  })
  @IsBoolean()
  withDeleted?: boolean = false;
}
