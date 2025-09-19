import { OrgUnit } from "@/modules/org-unit/entities/org-unit.entity";

export class OrgUnitWithPositionsDto extends OrgUnit {
  positions?: PositionLiteDto[];
}

export class PositionLiteDto {
  id: string;
  name: string;
}
