import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { UpdateUserDto } from './update-user.dto';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsArray, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { UserType } from '../user.enum';
import { PositionSubManager } from '@/modules/position/position.enum';
import { Type } from 'class-transformer';

export class GetListUserDto extends IntersectionType(
  PageOptionsDto,
  PartialType(PickType(UpdateUserDto, ['status', 'type', 'gender', 'officialStatus'])),
) {
  @ApiPropertyOptionalCustom({
    description: 'ID của position',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  positionIds?: string[] = [];

  @ApiPropertyOptionalCustom({
    description: 'ID của orgUnit',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  orgUnitIds?: string[] = [];

  @ApiPropertyOptionalCustom({
    description: 'ID của followers',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  followersIds?: string[] = [];

  @ApiPropertyOptionalCustom({
    description: 'ID của người không muốn tìm',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  notUserIds?: string[] = [];

  @ApiPropertyOptionalCustom({ description: 'Tìm kiếm theo tree' })
  @Type(() => Boolean)
  @IsBoolean()
  isSearchPosition?: boolean = false;

  @ApiPropertyOptionalCustom({ description: 'Tìm kiếm theo tree' })
  @Type(() => Boolean)
  @IsBoolean()
  isSearchOrgUnit?: boolean = false;

  @ApiPropertyOptionalCustom({
    enum: UserType,
    description: 'Loại người dùng',
    default: UserType.ADMIN,
  })
  @IsEnum(UserType)
  notType: UserType;

  @ApiPropertyOptionalCustom({
    enum: PositionSubManager,
    description: 'Loại phó quản lý đơn vị',
    default: PositionSubManager.MEMBER,
  })
  @IsEnum(PositionSubManager)
  subManager: PositionSubManager;

  @ApiPropertyOptionalCustom({
    description: 'ID của orgUnit hiện tại',
  })
  @IsUUID('4')
  currentOrgUnitId?: string;
}
