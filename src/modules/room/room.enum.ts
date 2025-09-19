export enum RoomGroupStatus {
  ACTIVE = 'Hoạt động', // Hoạt động
  LOCKED = 'Đã khóa', // Đã khóa
}

export enum RoomGroupReminderTimeType {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
}

export enum RoomGroupApprovalProcess {
  ALL_APPROVERS = 'ALL_APPROVERS', // Toàn bộ người duyệt duyệt thành công
  ANY_APPROVER = 'ANY_APPROVER', // Chỉ cần 1 người duyệt thành công
}

export enum RoomPurposeStatus {
  ACTIVE = 'ACTIVE', // Hoạt động
  LOCKED = 'LOCKED', // Đã khóa
}
