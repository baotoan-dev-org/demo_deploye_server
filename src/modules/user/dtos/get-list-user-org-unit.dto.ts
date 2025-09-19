import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { UpdateUserDto } from './update-user.dto';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsArray, IsBoolean, IsString } from 'class-validator';

export class GetListUserOrgUnitDto extends IntersectionType(
  PageOptionsDto,
  PartialType(PickType(UpdateUserDto, ['status', 'type', 'gender'])),
) {
  @ApiPropertyOptionalCustom({
    description: 'List code user',
  })
  @IsArray()
  @IsString({ each: true })
  codes?: string[] = [];

  @ApiPropertyOptionalCustom({
    description: 'lấy danh sách đơn vị đã xóa',
  })
  @IsBoolean()
  withDeleted?: boolean = false;
}
