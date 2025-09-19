import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { UpdateUserDto } from './update-user.dto';

export class GetListUserByUnitsDto extends IntersectionType(
  PageOptionsDto,
  PartialType(PickType(UpdateUserDto, ['status', 'type', 'gender'])),
) {
  @ApiPropertyOptionalCustom({
    type: [String],
    description: 'Danh sách orgUnitId dạng uuid',
  })
  @IsUUID('4', { each: true })
  orgUnitIds?: string[];
}
