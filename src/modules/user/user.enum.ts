export enum UserType {
  ROOT = 'Root',
  ADMIN = 'Admin',
  HR = 'HR',
  CANDIDATE = 'Candidate',
  EMPLOYEE = 'Employee', // ứng viên chấp nhận vào làm việc thì sẽ chuyển từ Candidate sang Employee
  USER = 'User', // ứng viên chấp nhận vào làm việc thì sẽ chuyển từ Candidate sang Employee
  C_B = 'C&B',
}

export enum UserStatus {
  ACTIVE = 'Đang làm việc',
  INACTIVE = 'Không hoạt động',
  DELETED = 'Đã xóa',
}

export enum Gender {
  MALE = 'Nam',
  FEMALE = 'Nữ',
  OTHER = 'Khác',
}

export enum UserDepartmentStatus {
  ACTIVE = 'Hoạt động',
  INACTIVE = 'Không hoạt động',
}

export enum UserDivisionStatus {
  ACTIVE = 'Hoạt động',
  INACTIVE = 'Không hoạt động',
}

export enum UserPositionStatus {
  ACTIVE = 'Hoạt động',
  INACTIVE = 'Không hoạt động',
}

export enum UserTeamStatus {
  ACTIVE = 'Hoạt động',
  INACTIVE = 'Không hoạt động',
}

export enum UserMovementType {
  APPOINTMENT = 'Bổ nhiệm', // Bổ nhiệm
  TRANSFER = 'Điều chuyển', // Điều chuyển
  DEMOTION = 'Miễn nhiệm', // Miễn nhiệm
}

export enum UserMovementStatus {
  PENDING = 'Đang chờ',
  APPROVED = 'Đã phê duyệt',
  REJECTED = 'Đã từ chối',
  EFFECTIVE = 'Có hiệu lực',
  CANCELLED = 'Hủy ban hành',
  VIEW = 'Xem',
}

export enum UserApproveTransferType {
  OLD = 'old',
  NEW = 'new',
}

export enum UserMovementSearchType {
  MY_PROPOSAL = 'Đề xuất của tôi',
  NEED_APPROVE = 'Đề xuất cần phê duyệt',
  ALL = 'Tất cả',
}

export enum UserMovementApproveType {
  APPROVE = 'Người phê duyệt',
  FOLLOWERS = 'Người theo dõi',
  CREATOR = 'Người tạo đề xuất',
}

export enum RejectionReason {
  INSUFFICIENT_QUALIFICATIONS = 'Nhân sự không đáp ứng tiêu chuẩn vị trí',

  POOR_PERFORMANCE = 'Hiệu suất làm việc của nhân sự không đạt yêu cầu',

  LACK_OF_SKILLS = 'Nhân sự thiếu kỹ năng chuyên môn',

  PROCESS_VIOLATION = 'Đề xuất trên vi phạm quy trình nội bộ',

  NOT_FIT_PLANNING = 'Không phù hợp với quy hoạch nhân sự',

  LEGAL_VIOLATION = 'Không tuân thủ quy định pháp luật',

  IMPACT_CURRENT_OPERATIONS = 'Đề xuất gây ảnh hưởng đến hoạt động hiện tại của tổ chức',

  NOT_FIT_CURRENT_NEEDS = 'Không phù hợp với nhu cầu hiện tại',

  NEGATIVE_TEAM_MORALE = 'Tác động tiêu cực đến tinh thần đội ngũ',

  LACK_OF_TRANSPARENCY = 'Đề xuất trên thiếu minh bạch',

  LACK_OF_FAIRNESS = 'Đề xuất trên không đảm bảo công bằng',

  INAPPROPRIATE_TIMING = 'Thời điểm không phù hợp',

  INSUFFICIENT_EVALUATION_TIME = 'Nhân sự chưa đủ thời gian đánh giá',

  INAPPROPRIATE_BEHAVIOR = 'Nhân sự có hành vi không phù hợp',

  CONFLICT_OF_INTEREST = 'Đề xuất trên gây xung đột lợi ích trong tổ chức',

  OTHER = 'Khác',
}

export enum SubManagerStatus {
  ACTIVE = 'Hoạt động',
  INACTIVE = 'Không hoạt động',
}

export enum UserTrackingType {
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_MOVEMENT_UPDATE = 'user_movement_update',
}

export enum UserExportExcelColumn {
  CODE = 'code',
  NAME = 'name',
  CCCD = 'cccd',
  EMAIL = 'email',
  PHONE = 'phone',
  BIRTHDAY = 'birthday',
  POSITION = 'position',
  DATE_ONBOARD = 'dateOnboard',
  ADDRESS = 'address',
  TEMP_ADDRESS = 'tempAddress',
  GENDER = 'gender',
  OFFICIAL_STATUS = 'officialStatus',
  DIRECTOR = 'director',
  DIVISION = 'division',
  DEPARTMENT = 'department',
  PART = 'part',
  TEAM = 'team',
}

export enum UserOfficialStatus {
  OFFICIAL = 'Chính thức',
  TRIAL = 'Thử việc',
}

export enum UserPositionType {
  MAIN = 'Chức vụ chính',
  SUB = 'Chức vụ kim nhiệm',
}

export enum UserLevel {
  OPERATION_MANAGER = 'Điều hành',
  OPERATION_MANAGER_HIGH = 'Quản lý cấp cao',
  OPERATION_MANAGER_MEDIUM = 'Quản lý cấp trung',
  OPERATION_MANAGER_LOW = 'Quản lý cấp cơ sở',
  SPECIALIST = 'Chuyên viên',
  EMPLOYEE = 'Nhân viên',
  LABOR = 'Công nhân',
  STUDENT = 'Học việc',
  INTERNSHIP = 'Thực tập sinh',
}

export enum UserEducationLevel {
  DOCTOR = 'Tiến sĩ',
  MASTER = 'Thạc sĩ',
  UNDERGRADUATE = 'Đại học',
  ASSOCIATE = 'Cao đẳng',
  TECHNICAL = 'Trung cấp/ Nghề',
  NONE = 'Không',
}

export enum UserCultureLevel {
  NONE = 'Không',
  ONE = '1/12',
  TWO = '2/12',
  THREE = '3/12',
  FOUR = '4/12',
  FIVE = '5/12',
  SIX = '6/12',
  SEVEN = '7/12',
  EIGHT = '8/12',
  NINE = '9/12',
  TEN = '10/12',
  ELEVEN = '11/12',
  TWELVE = '12/12',
}

export enum UserResignType {
  RESIGN_BY_REQUEST = 'Nghỉ việc theo đơn',
  RESIGN_BY_AGREEMENT = 'Thỏa thuận thanh lý hợp đồng',
  RESIGN_BY_FIRE = 'Sa thải',
  RESIGN_BY_THREE_MONTH_TRIAL = 'Chấm dứt thử việc',
  RESIGN_BY_ANGULAR = 'Nghỉ ngang (Bỏ việc)',
  RESIGN_BY_OTHER = 'Khác',
}

export enum UserCitizenIdentificationPlace {
  CUS = 'Cục cảnh sát QLHC về TTXH',
}

export enum UserEthnic {
  KINH = 'Kinh',
  TAY = 'Tày',
  THAI = 'Thái',
  MUONG = 'Mường',
  KHOME = 'Khơ-me',
  HOA = 'Hoa',
  NUNG = 'Nùng',
  HMONG = 'H’Mông',
  DAO = 'Dao',
  GIA_RAI = 'Gia-rai',
  NGAI = 'Ngái',
  E_DE = 'Ê-đê',
  BA_NA = 'Ba-na',
  XO_DANG = 'Xơ-Đăng',
  SAN_CHAY = 'Sán Chay',
  CO_HO = 'Cơ-ho',
  CHAM = 'Chăm',
  SAN_DIU = 'Sán Dìu',
  HRE = 'Hrê',
  MNONG = 'Mnông',
  RAGLAI = 'Ra-glai',
  XTIENG = 'Xtiêng',
  BRU_VAN_KIEU = 'Bru-Vân Kiều',
  THO = 'Thổ',
  GIAY = 'Giấy',
  CO_TU = 'Cơ-tu',
  GIE_TRIENG = 'Gié-Triêng',
  MA = 'Mạ',
  KHO_MU = 'Khơ-mú',
  CO = 'Co',
  TA_OI = 'Tà-ôi',
  CHO_RO = 'Chơ-ro',
  KHANG = 'Kháng',
  XINH_MUN = 'Xinh-mun',
  HA_NHI = 'Hà Nhì',
  CHU_RU = 'Chu-ru',
  LAO = 'Lào',
  LA_CHI = 'La Chi',
  LA_HA = 'La Ha',
  PHU_LA = 'Phù Lá',
  LA_HU = 'La Hủ',
  LU = 'Lự',
  LO_LO = 'Lô Lô',
  CHUT = 'Chứt',
  MANG = 'Mảng',
  PA_THEN = 'Pà Thẻn',
  CO_LAO = 'Cơ Lao',
  CONG = 'Cống',
  BO_Y = 'Bố Y',
  SI_LA = 'Si La',
  PU_PEO = 'Pu Péo',
  BRAU = 'Brâu',
  O_DU = 'Ơ Đu',
  RO_MAM = 'Rơ Măm',
}

export enum UserReligion {
  PHAT_GIAO = 'Phật giáo',
  CONG_GIAO = 'Công giáo',
  TIN_LANH = 'Tin Lành',
  HOI_GIAO = 'Hồi giáo',
  CAO_DAI = 'Cao Đài',
  HOA_HAO = 'Phật giáo Hòa Hảo',
  TINH_DO_CU_SI = 'Tịnh độ Cư sĩ Phật hội Việt Nam',
  TU_AN_HIEU_NGHIA = 'Tứ Ân Hiếu Nghĩa',
  BUU_SON_KY_HUONG = 'Bửu Sơn Kỳ Hương',
  BAHAI = 'Bahá’í',
  MINH_SU_DAO = 'Minh Sư Đạo',
  MINH_LY_DAO = 'Minh Lý Đạo',
  MORMON = 'Giáo hội các Thánh hữu Ngày sau',
  KHONG_TON_GIAO = 'Không tôn giáo',
  KHAC = 'Khác',
}

export enum UserMaritalStatus {
  MARRIED = 'Đã kết hôn',
  SINGLE = 'Độc thân',
}

export enum UserBankName {
  AGRIBANK = 'Agribank (Ngân hàng Nông nghiệp và PTNT Việt Nam)',
  VIETCOMBANK = 'Vietcombank (Ngân hàng Ngoại thương Việt Nam)',
  VIETINBANK = 'VietinBank (Ngân hàng Công Thương Việt Nam)',
  BIDV = 'BIDV (Ngân hàng Đầu tư và PT Việt Nam)',
  VPBANK = 'VPBank (Ngân hàng Việt Nam Thịnh Vượng)',
  TECHCOMBANK = 'Techcombank (Ngân hàng Kỹ Thương Việt Nam)',
  MBBANK = 'MBBank (Ngân hàng Quân đội)',
  ACB = 'ACB (Ngân hàng Á Châu)',
  SHB = 'SHB (Ngân hàng Sài Gòn – Hà Nội)',
  HDBANK = 'HDBank (Ngân hàng Phát triển TP HCM)',
  LIENVietPostBank = 'LienVietPostBank (Ngân hàng Bưu điện Liên Việt / LPBank)',
  VIB = 'VIB (Ngân hàng TMCP Quốc tế Việt Nam)',
  SEABANK = 'SeABank (Ngân hàng Đông Nam Á)',
  TPBANK = 'TPBank (Ngân hàng Tiên Phong)',
  OCB = 'OCB (Ngân hàng Phương Đông)',
  MSB = 'MSB (Ngân hàng Hàng Hải Việt Nam)',
  SACOMBANK = 'Sacombank (Ngân hàng Sài Gòn Thương Tín)',
  EXIMBANK = 'Eximbank (Ngân hàng Xuất Nhập khẩu Việt Nam)',
  SCB = 'SCB (Ngân hàng Sài Gòn)',
  PVCOMBANK = 'PVcomBank (Ngân hàng Đại chúng Việt Nam)',
  NAM_A_BANK = 'Nam A Bank',
  AB_BANK = 'ABBank',
  BAC_A_BANK = 'Bac A Bank',
  DONG_A_BANK = 'DongA Bank',
  OCEAN_BANK = 'Ocean Bank',
  BAO_VIET_BANK = 'BaoViet Bank',
  PETROLIMEX_BANK = 'Petrolimex Bank',
  VIET_A_BANK = 'VietABank',
}
