import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { User } from '../entities/user.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';

export interface UserRelationUpdate {
  entity: object[];
  ids: string[];
}

export interface UserPermissionInterface {
  user: UserRequest;
  currentOrgUnit: OrgUnit;
  descendantOrgUnitIds: string[];
  list: User[];
  managersByUser: Record<string, any>;
}
