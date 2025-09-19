export enum ProposalType {
  PROJECT_PROPOSAL = 'project_proposal',
  JOB_RECRUITMENT = 'job_recruitment',
  USER_MOVEMENT = 'user_movement',
}

export enum ProposalSearchType {
  MY_PROPOSAL = 'Đề xuất của tôi',
  NEED_APPROVE = 'Đề xuất cần phê duyệt',
  ALL = 'Tất cả',
}

export enum ProposalRequestType {
  EXTEND_DEADLINE = 'Gia hạn thời hạn',
  CHANGE_ASSIGNEE = 'Thay đổi người phụ trách',
  CHANGE_ORG_UNIT = 'Thay đổi đơn vị',
  BUDGET_APPROVAL = 'Phê duyệt ngân sách',
  APPROVE_CROSS_DEPARTMENT = 'Phê duyệt liên khối',
  APPOINTMENT = 'Bổ nhiệm',
  TRANSFER = 'Điều chuyển',
  DEMOTION = 'Miễn nhiệm',
  CANCEL = 'Hủy',
  OTHER = 'Khác',
}
