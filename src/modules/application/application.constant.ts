import { ApplicationStatus } from './application.enum';

export const VALID_STATUS_TRANSITIONS = {
  [ApplicationStatus.PENDING]: [
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.NOT_QUALIFIED,
    ApplicationStatus.SAVED_CV,
  ],
  [ApplicationStatus.INTERVIEW]: [
    ApplicationStatus.OFFERED,
    ApplicationStatus.SAVED_CV,
    ApplicationStatus.THANK_LETTER,
  ],
  [ApplicationStatus.OFFERED]: [ApplicationStatus.ACCEPTANCE, ApplicationStatus.REJECTED],
  [ApplicationStatus.THANK_LETTER]: [],
  [ApplicationStatus.NOT_QUALIFIED]: [],
  [ApplicationStatus.SAVED_CV]: [
    ApplicationStatus.PENDING,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.THANK_LETTER,
  ],
  [ApplicationStatus.ACCEPTANCE]: [ApplicationStatus.ONBOARD],
  [ApplicationStatus.REJECTED]: [],
};
