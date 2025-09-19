export interface ExtendDeadlineValue {
  newEndDate?: string;
  newEstimateDate?: string;
}

export interface ChangeAssigneeValue {
  oldUserId?: string;
  replacementUserId: string;
}

export interface SubManagerValue {
  id: string;
  name: string;
  type: number;
}

export type ProposalValue = ExtendDeadlineValue | ChangeAssigneeValue;

export interface CancelledUserMovementValue {
  id: string;
  code: string;
  name: string;
  url: string;
}
