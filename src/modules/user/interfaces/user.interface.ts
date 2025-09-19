import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from '../entities/user-unit-position.entity';
import { UserMovement } from '../entities/user-movement.entity';

// Interface cho thông tin manager/người quản lý
interface Manager {
  id: string;
  name: string;
  email?: string; // Optional vì không phải tất cả manager đều có email
  url: string; // URL avatar/hình ảnh
}

// Interface cho đơn vị tổ chức (phòng ban, khối, etc.)
interface OrganizationUnit {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string;
  type: number;
  manager: Manager;
  level: number;
}

export interface UserDetailHistory {
  orgUnits: OrganizationUnit[];
  userOrgUnitPositions: UserOrgUnitPosition[] & { orgUnits: OrgUnit[] };
}

export interface UserMovementHistory {
  userMovements: UserMovement[];
}

export interface UserHistory {
  userHistory: {
    id: string;
    updatedAt: string;
    createdBy: {
      id: string;
      code: string;
      name: string;
      url: string;
    };
  };
  changes: {
    field: string;
    old: [
      OrgUnit: {
        id: string;
        name: string;
      },
      Position: {
        id: string;
        name: string;
      },
    ];
    new: [
      OrgUnit: {
        id: string;
        name: string;
      },
      Position: {
        id: string;
        name: string;
      },
    ];
  };
}

export interface UserDeletedValue {
  userDetailHistory: UserDetailHistory;
  userMovementHistory: UserMovementHistory;
  userHistory: UserHistory;
}
