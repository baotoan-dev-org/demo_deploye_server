import { User } from '@/modules/user/entities/user.entity';

export interface TopUserDashboard {
  userId: string;
  userName: string;
  userAvatar: string;
  totalTask: number;
  doneTask: number;
  avgProgress: number;
}
