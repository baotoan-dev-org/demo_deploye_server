import { NotificationType } from '../notification/notification.enum';
import { UserMovementType } from './user.enum';

export const userMovementTypeToNotificationType = {
  [UserMovementType.APPOINTMENT]: NotificationType.APPOINTMENT,
  [UserMovementType.TRANSFER]: NotificationType.TRANSFER,
  [UserMovementType.DEMOTION]: NotificationType.DEMOTION,
  // ...add other mappings as needed
};
