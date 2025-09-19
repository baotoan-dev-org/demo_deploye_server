import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { User } from '@/modules/user/entities/user.entity';

export interface ProjectTaskImportCache {
  userByCode: Map<string, User | null>;
  userPositionsByUserId: Map<string, Set<string>>;
  orgUnitByName: Map<string, OrgUnit | null>;
  descendantsByOrgUnitId: Map<string, Set<string>>;
  membershipCache: Map<string, boolean>;
}
