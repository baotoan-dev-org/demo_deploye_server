export interface ProjectTaskProposalUserInfo {
  id: string;
  name: string;
  url: string;
}

export interface ProjectTaskProposalOrgUnitInfo {
  id: string;
  name: string;
  type: string;
}
export interface ProjectTaskProposalDeadlineValue {
  oldEndDate?: Date | null;
  oldEstimateDate?: Date | null;
  newEndDate?: Date | null;
  newEstimateDate?: Date | null;
}

export interface ProjectTaskProposalChangeAssigneeValue {
  oldUser?: ProjectTaskProposalUserInfo[];
  replacementUser?: ProjectTaskProposalUserInfo[];
}

export interface ProjectTaskProposalChangeOrgUnitValue {
  oldOrgUnit?: ProjectTaskProposalOrgUnitInfo[];
  newOrgUnit?: ProjectTaskProposalOrgUnitInfo[];
}

export type ProjectTaskProposalValue =
  | ProjectTaskProposalDeadlineValue
  | ProjectTaskProposalChangeAssigneeValue
  | ProjectTaskProposalChangeOrgUnitValue;

export enum ProjectTaskProposalActionType {
  CREATE = 1,
  APPROVE = 2,
}
