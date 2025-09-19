import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class GetOrgUnitSearchDto {
  @ApiPropertyOptionalCustom({ description: 'Tên của đơn vị' })
  @IsString()
  search: string;

  @ApiPropertyOptionalCustom({ description: 'ID đơn vị' })
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptionalCustom({ description: 'Có phải là update không' })
  @IsBoolean()
  isUpdate?: boolean;
}
