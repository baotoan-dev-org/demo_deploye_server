export enum ApplicationStatus {
  PENDING = 'Mới ứng tuyển',
  INTERVIEW = 'Mời phỏng vấn',
  OFFERED = 'Mời nhận việc',
  NOT_QUALIFIED = 'Hồ sơ không đạt',
  THANK_LETTER = 'Thư cảm ơn',
  SAVED_CV = 'Lưu hồ sơ',
  ACCEPTANCE = 'Đã chấp nhận', // ứng viên đã chấp nhận lời mời làm việc
  REJECTED = 'Đã từ chối', // ứng viên đã từ chối lời mời làm việc
  ONBOARD = 'Nhận việc' // ứng viên vào làm việc
}

export enum ApplicationHistoryAction {
  CREATED = 'Ứng tuyển',
  STATUS_CHANGE = 'Thay đổi trạng thái'
}