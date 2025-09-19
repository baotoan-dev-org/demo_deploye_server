import { DeepPartial } from 'typeorm';
import { UserOrgUnitPosition } from '../entities/user-unit-position.entity';
import { UserMovement } from '../entities/user-movement.entity';

// Định nghĩa interface cho payload
export interface UserMovementApprovedPayload {
  userMovementId: string;
  oldUnitPositionDelete: DeepPartial<UserOrgUnitPosition>;
  newUnitPositionInsert: DeepPartial<UserOrgUnitPosition>;
  isManager: boolean;
  oldManager: boolean;
  orgUnitId?: string;
  oldOrgUnitId?: string;
  approverIds?: string[];
  userMovement?: UserMovement;
}
