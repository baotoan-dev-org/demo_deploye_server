import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsEnum } from 'class-validator';
import { UserPositionType } from '../user.enum';

export class GetListUserOrgPositionDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({
    description: 'User position type',
    enum: UserPositionType,
    default: UserPositionType.MAIN,
  })
  @IsEnum(UserPositionType)
  userPositionType?: UserPositionType;
}
