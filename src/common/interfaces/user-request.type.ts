import { UserStatus, UserType } from 'src/modules/user/user.enum';

export interface UserRequest {
  id: string;
  name: string;
  email?: string;
  type?: UserType;
  status?: UserStatus;
  positionId?: string;
  orgUnitId?: string;
}
