import { UserType } from '../user/user.enum';

// SYSTEM
export enum SocketNamespace {
  SYSTEM = 'system',
  CHAT = 'chat',
}

export enum SocketSystemRoom {
  ROOT = UserType.ROOT,
  CUSTOMER = UserType.CANDIDATE,
  ADMIN = UserType.ADMIN,
}

export enum SocketSystemEvent {
  NEW_APPLICATION = 'new-application',
  UPDATE_DISCUSSION = 'update-discussion',
  DELETE_DISCUSSION = 'delete-discussion',
}
