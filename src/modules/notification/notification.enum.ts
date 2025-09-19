export enum NotificationType {
  SYSTEM = 'Hệ thống',
  APPLICATION = 'Ứng tuyển',
  INTERVIEW_BOOKING = 'Đặt lịch phỏng vấn',
  HIRED = 'Đã tuyển dụng',
  RECRUITMENT_REQUEST = 'Yêu cầu tuyển dụng',
  PROPOSAL = 'Đề xuất',
  APPOINTMENT = 'Bổ nhiệm', // Bổ nhiệm
  TRANSFER = 'Điều chuyển', // Điều chuyển
  DEMOTION = 'Miễn nhiệm', // Miễn nhiệm
  TASK_EXPIRED = 'Công việc hết hạn',
  TASK_BEHIND_SCHEDULE = 'Công việc chậm tiến độ',
  TASK_PROGRESS = 'Công việc cập nhật tiến độ',
  PROJECT_TASK = 'Công việc dự án',
  COMMENT = 'Bình luận',
}

export enum UpdateNotificationAction {
  VIEW_ONE = 'View one',
  VIEW_ALL = 'View all',
  DELETE_VIEWED = 'Delete viewed',
  DELETE_ALL = 'Delete all',
  DELETE_ONE = 'Delete one',
}

export enum NotificationStatus {
  VIEWED = 'Đã xem',
  NOT_VIEWED = 'Chưa xem',
}
