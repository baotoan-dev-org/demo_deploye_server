import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListOrgUnitByProjectTaskDto {
  @ApiPropertyOptionalCustom({
    description: 'ID của dự án hoặc task',
    type: String,
  })
  projectTaskId?: string;

  // search
  @ApiPropertyOptionalCustom({
    description: 'Tên đơn vị',
    type: String,
  })
  search?: string;

  @ApiPropertyOptionalCustom({
    description: 'Loại thực thể',
    type: String,
  })
  type?: string;
}
