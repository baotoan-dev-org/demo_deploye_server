// Constants
export const PROGRESS_COMPLETE = 100;
export const PROGRESS_NOT_STARTED = 0;
export const MIN_DATE = '1900-01-01';
export const MAX_DATE = '9999-12-31';

// Error messages
export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'Một hoặc nhiều người dùng không tồn tại trong hệ thống',
  ORG_UNIT_NOT_FOUND: 'Một hoặc nhiều tổ chức không tồn tại trong hệ thống',
  CANNOT_UPDATE_PROGRESS_WITH_CHILDREN: 'Không thể cập nhật tiến độ cho công việc có công việc con',
  NO_PERMISSION_UPDATE_PROGRESS: 'Bạn không có quyền cập nhật tiến độ công việc này',
  PROGRESS_NOT_CHANGED: 'Tiến độ công việc không thay đổi',
  NO_PERMISSION_DELAY_REASON: 'Bạn không có quyền cập nhật lý do trì hoãn dự án này',
  DELAY_REASON_NOT_CHANGED: 'Lý do trì hoãn không thay đổi',
  DEPENDS_ON_TASK_INVALID: 'Chỉ có thể phụ thuộc vào một công việc khác. Vui lòng kiểm tra lại.',
};
