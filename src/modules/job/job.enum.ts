export enum JobType {
  FULLTIME = 'Toàn thời gian',
  PARTTIME = 'Bán thời gian',
  INTERN = 'Thực tập',
  FREELANCE = 'Tự do',
  REMOTE = 'Từ xa',
  CONTRACT = 'Hợp đồng',
}

export enum JobTag {
  HOT = 'Tuyển gấp',
  NEW = 'Mới',
  EXPANSION = 'Tăng định biên',
}

export enum JobStatus {
  PENDING = 'Chờ phê duyệt', // Lúc các trưởng phòng tạo - Yêu cầu tuyển
  APPROVED = 'Được phê duyệt', // Khi tất cả job approve được duyệt
  RECRUITING = 'Đang tuyển', // Khi HR đăng job lên site
  COMPLETED = 'Hoàn tất', // Khi tuyển đủ người
  REJECTED = 'Từ chối', // Cần thêm lý do từ chối
}

export enum JobApproverStatus {
  PENDING = 'Đang chờ',
  APPROVED = 'Đã phê duyệt',
  REJECTED = 'Đã từ chối',
}

export enum JobPriority {
  NORMAL = 'Bình thường',
  URGENT = 'Gấp',
}

export enum JobCountType {
  APPLIED = 'appliedCount',
  INTERVIEWED = 'interviewedCount',
  PASSED = 'passedInterviewCount',
  ACCEPTANCE = 'acceptanceCount',
  ONBOARD = 'onboardCount',
  NOT_QUALIFIED = 'notQualifiedCount',
}

export enum RecruitmentReason {
  NEW_HIRE = 'Tuyển trong định biên',
  EXPANSION = 'Tuyển tăng định biên',
  REPLACEMENT = 'Tuyển thay thế',
}

export enum WorkArea {
  OFFICE = 'Văn phòng, 200 Nguyễn Văn Bá, P.Trường Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
  FACTORY_1 = 'Xưởng 1, 200 Nguyễn Văn Bá, P.Trường Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
  FACTORY_2 = 'Xưởng 2, 200 Nguyễn Văn Bá, P.Trường Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
  FACTORY_3 = 'Xưởng 3, 200 Nguyễn Văn Bá, P.Trường Thọ, TP. Thủ Đức, TP. Hồ Chí Minh',
}

export enum JobLogAction {
  CREATE = 'Tạo mới',
  UPDATE = 'Cập nhật',
  DELETE = 'Xóa',
  APPROVE = 'Phê duyệt',
  REJECT = 'Từ chối',
  RECRUIT = 'Đăng tuyển',
  COMMENT = 'Bình luận'
}

export enum JobLogType {
  JOB_RECRUITMENT = 'Yêu cầu tuyển dụng',
  JOB_APPROVER = 'Phê duyệt yêu cầu tuyển dụng',
  JOB = 'Công việc',
}

export enum RecruitmentPlatform {
  OFFICE_SEVAGO = 'Office Sevago',
  CAREERVIET = 'Careerviet',
  TOPCV = 'TopCV',
  VIECLAMTOT = 'Việc làm tốt',
  VIECLAM24H = 'Việc làm 24h',
  VIETNAMWORKS = 'VietNamWorks',
}
