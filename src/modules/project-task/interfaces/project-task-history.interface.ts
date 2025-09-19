import { ProjectTaskAssignee } from '../entities/project-task-assignee.entity';

export interface ProjectTaskHistory {
  attachments?: { url: string; name: string }[];
  assignees?: {
    userId: string;
    name: string;
    orgUnitId: string;
    orgUnitName: string;
    url: string;
    type: string;
  }[];
}
