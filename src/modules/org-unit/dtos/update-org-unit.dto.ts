import { IntersectionType, PartialType } from '@nestjs/swagger';
import { CreateOrgUnitDto } from './create-org-unit.dto';
import { IsEnum } from 'class-validator';
import { OrgUnitStatus } from '../org-unit.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class UpdateOrgUnitDto extends PartialType(IntersectionType(CreateOrgUnitDto)) {
  @ApiPropertyOptionalCustom({ description: 'Trạng thái', enum: OrgUnitStatus })
  @IsEnum(OrgUnitStatus)
  status: OrgUnitStatus;
}
