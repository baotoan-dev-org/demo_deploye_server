import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { ProjectTask } from '../entities/project-task.entity';
import {
  ProjectTaskBudgetWarningGrantChart,
  ProjectTaskProgressWarningGrantChart,
} from '../project-task.enum';
import { ProjectTaskBudgetStatus } from '../project-task.enum';

export interface ProjectTaskDivision {
  id: string;
  name: string;
  type?: OrgUnitType;
}

export interface ProjectTaskChildWithStatus extends ProjectTask {
  displayStatus: string;
  totalNotStartedTasks: number;
  totalInProgressTasks: number;
  totalCompletedTasks: number;
  totalOverdueTasks: number;
  totalTasks: number;
  children: ProjectTaskChildWithStatus[];
}

export interface ProjectTaskWithStatus extends ProjectTask {
  displayStatus?: string;
  isAssigned?: boolean;
  isCreator?: boolean;
  isFirstCreateProposalBudget?: boolean;
  timeProgressPercent?: number;
  overdueProgressPercent?: number;
  progressWarningStatus?: ProjectTaskProgressWarningGrantChart;
  progressWarningGap?: number;
  minExpectedProgress?: number;
  orgUnits?: {
    id: string;
    name: string;
  }[];
  budgetApprovers?: {
    id: string;
    projectTaskId: string;
    projectTaskProposalApprovers: {
      id: string;
      userId: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }[];
  proposalStatus?: string;
  budgetStatus: ProjectTaskBudgetStatus;
  isHaveBudget?: boolean;
  canUpdateProgress?: boolean;
  divisions?: ProjectTaskDivision[];
  budgetWarningStatus?: ProjectTaskBudgetWarningGrantChart;
  minExpectedBudget?: number;
}

export interface ProjectTaskAssigneeHistory {
  userId: string | null;
  name: string | null;
  orgUnitId: string | null;
  orgUnitName: string | null;
  type: number;
  url: string | null;
}

export interface ProjectTaskStats extends ProjectTask {
  totalNotStartedTasks: number;
  totalInProgressTasks: number;
  totalCompletedTasks: number;
  totalOverdueTasks: number;
  totalTasks: number;
  users?: Array<{ id: string; name: string; url?: string }>;
  orgUnits?: Array<{ id: string; name: string; type?: string }>;
}
