import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { UserMovementType } from '@/modules/user/user.enum';

export class GetTreeOrgUnitDto {
  @ApiPropertyOptionalCustom({ description: 'Loại bổ nhiệm', enum: UserMovementType })
  @IsEnum(UserMovementType)
  type: UserMovementType;

  @ApiPropertyOptionalCustom({ description: 'ID đơn vị con' })
  @IsUUID()
  childrenId?: string;

  @ApiPropertyOptionalCustom({ description: 'Tên đơn vị' })
  @IsString()
  search?: string;
}
