import { OrgUnitType } from '../org-unit/org-unit.enum';

export enum ProjectTaskStatus {
  ACTIVE = 'Đang hoạt động',
  PAUSED = 'Tạm dừng',
  COMPLETED = 'Hoàn thành',
  IN_PROGRESS = 'Đang tiến hành',
}

export enum ProjectTaskDisplayStatus {
  NOT_STARTED = 'Chưa bắt đầu',
  IN_PROGRESS = 'Đang tiến hành',
  COMPLETED = 'Hoàn thành',
  PAUSED = 'Tạm dừng',
  OVERDUE = 'Quá hạn',
  COMPLETED_LATE = 'Hoàn thành trễ',
}

export enum ProjectTaskType {
  PROJECT = 'Project',
  TASK = 'Task',
  TODO = 'Todo',
}

export enum ProjectTaskAssigneeType {
  BOARD_OF_DIRECTORS = OrgUnitType.BOARD_OF_DIRECTORS,
  DIVISION = OrgUnitType.DIVISION,
  DEPARTMENT = OrgUnitType.DEPARTMENT,
  PART = OrgUnitType.PART,
  TEAM = OrgUnitType.TEAM,
  USER = OrgUnitType.TEAM + 2,
}

export enum ProjectTaskHistoryAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum ProjectTaskProgressWarningGrantChart {
  ON_TRACK = 'On track', // Đúng tiến độ: Tiến độ thực tế >= thời gian đã trôi qua - 5%
  BEHIND = 'Behind', // Chậm tiến độ: Tiến độ thực tế < thời gian đã trôi qua - 5%
  OVERDUE = 'Overdue', // Đã quá hạn: Thời gian thực tế đã vượt qua thời gian kết thúc
}

export enum ProjectTaskBudgetWarningGrantChart {
  ON_BUDGET = 'On budget',
  BELOW_BUDGET = 'Below budget',
  ABOVE_BUDGET = 'Above budget',
}

export enum ProjectTaskProgressWarningStatus {
  SAFE = 'safe', // Tiến độ an toàn
  WARNING = 'warning', // Tiến độ cảnh báo
  DANGER = 'danger', // Tiến độ nguy hiểm
}

export enum ProjectTaskDashboardType {
  USER = 'user',
  DIVISION = 'division',
}

export enum ProjectTaskDelayReason {
  INSUFFICIENT_MANPOWER = 'Thiếu nhân lực',
  RESOURCE_SUPPLY_DELAY = 'Chậm trễ trong cung cấp tài nguyên',
  CUSTOMER_REQUIREMENT_CHANGE = 'Thay đổi yêu cầu từ khách hàng',
  WORK_OVERLOAD_AND_UNFAIR_ASSIGNMENT = 'Quá tải công việc, phân công không hợp lý',
  FINANCIAL_ISSUES = 'Vấn đề về tài chính',
  TECHNICAL_ISSUES = 'Vấn đề kỹ thuật (Lỗi phần mềm hay thử nghiệm thất bại)',
  PROJECT_MANAGEMENT_ERRORS = 'Lỗi Quản lý dự án (Lỗi trong việc quản lý và lập kế hoạch)',
  COMMUNICATION_ISSUES = 'Khó khăn trong giao tiếp',
  UNFORESEEN_INCIDENTS = 'Sự cố không lường trước (Các tình huống thiên tai, dịch bệnh)',
  PROCESS_ISSUES = 'Vấn đề về quy trình (Quy trình kiểm tra chất lượng không được thực hiện đúng)',
  SUPPLIER_ISSUES = 'Vấn đề với nhà cung cấp',
  UNCLEAR_STRATEGIC_DIRECTION = 'Định hướng chiến lược không rõ ràng (Thay đổi mục tiêu dự án)',
  INSUFFICIENT_EXPERTISE = 'Thiếu kinh nghiệm chuyên môn đội ngũ',
  CRISIS_MODE = 'Crisis Mode',
}

export enum ProjectTaskBudgetStatus {
  PROJECT_NOT_HAVE_BUDGET = 'Không có ngân sách',
  PROJECT_HAVE_BUDGET_NOT_APPROVED = 'Chưa gửi phê duyệt',
  PROJECT_HAVE_BUDGET_APPROVED = 'Được phê duyệt',
  PROJECT_HAVE_BUDGET_REJECTED = 'Đã bị từ chối',
  PROJECT_HAVE_BUDGET_PENDING = 'Đang chờ phê duyệt',
}

export enum ProjectTaskPriority {
  NORMAL = 'Bình thường',
  HIGH = 'Cao',
  URGENT = 'Khẩn cấp',
}

export enum ProjectTaskDetailStatus {
  NORMAL = 'normal',
  USER = 'user',
}

export enum ProjectTaskUpdateAssigneeType {
  USER = 'user',
  ORG_UNIT = 'org_unit',
  ALL = 'all',
}

export enum ProjectTaskViewType {
  ALL = 'all',
  DIVISION = 'division',
  CROSS_DIVISION = 'cross_division',
}

export enum ProjectTaskGetInfoOption {
  ALL = 'all',
  DIVISION = 'division',
  DEPARTMENT = 'department',
}

export enum ProjectTaskProposalType {
  EXTEND_DEADLINE = 'Gia hạn thời hạn',
  CHANGE_ASSIGNEE = 'Thay đổi người phụ trách',
  CHANGE_ORG_UNIT = 'Thay đổi đơn vị',
  BUDGET_APPROVAL = 'Phê duyệt ngân sách',
  CANCEL = 'Hủy',
  OTHER = 'Khác',
  APPROVE_CROSS_DEPARTMENT = 'Phê duyệt liên khối',
}

export enum ProjectTaskProposalStatus {
  PENDING = 'Đang chờ',
  APPROVED = 'Đã phê duyệt',
  REJECTED = 'Đã từ chối',
}

// Các loại get proposal
export enum ProjectTaskProposalFilterType {
  MY_PROPOSAL = 'Đề xuất của tôi',
  NEED_APPROVE = 'Đề xuất cần phê duyệt',
  ALL = 'Tất cả',
}
