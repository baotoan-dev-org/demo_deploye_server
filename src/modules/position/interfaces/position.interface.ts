import { User } from '@/modules/user/entities/user.entity';

export interface OrgChartNode {
  id: string;
  name: string;
  position: string;
  avatar: string;
  level: number;
  children?: OrgChartNode[];
  user?: User;
  type?: string;
  childrenCount?: number;
  typeAction: string;
}

export interface PositionTreeNode {
  id: string;
  name: string;
  status: string;
  parentId: string | null;
  manager: {
    id: string;
    name: string;
    url?: string;
  } | null;
  permission: boolean;
  children: PositionTreeNode[];
}
