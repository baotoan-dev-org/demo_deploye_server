import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsDate, IsNumber, IsArray, ValidateNested } from 'class-validator';
import {
  Gender,
  UserBankName,
  UserCitizenIdentificationPlace,
  UserCultureLevel,
  UserEducationLevel,
  UserEthnic,
  UserLevel,
  UserMaritalStatus,
  UserOfficialStatus,
  UserReligion,
  UserResignType,
  UserType,
} from '../user.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { Type } from 'class-transformer';

export class CreateUserChildrenDto {
  @ApiPropertyOptionalCustom({ description: 'Tên người thân', default: 'Tên người thân' })
  @IsString()
  relativeName?: string;

  @ApiPropertyOptionalCustom({ description: 'Số điện thoại người thân', default: '0901234567' })
  @IsString()
  relativePhone?: string;

  @ApiPropertyOptionalCustom({ description: 'Giới tính', default: Gender.MALE })
  @IsEnum(Gender)
  gender?: Gender;
}
export class CreateUserDto {
  @ApiProperty({ description: 'Mã định danh người dùng, duy nhất', default: 'user-001' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Họ tên người dùng', default: 'Nguyễn Văn A' })
  @IsString()
  name: string;

  @ApiPropertyOptionalCustom({ default: 'nva@gmail.com' })
  @IsString()
  email: string;

  @ApiProperty({ default: '0901234567' })
  @IsString()
  phone: string;

  @ApiProperty({ default: '1234567890' })
  @IsString()
  cccd?: string;

  @ApiPropertyOptionalCustom({ description: 'Ngày sinh dạng ISO string', default: new Date() })
  @IsDate()
  birthday?: Date;

  @ApiPropertyOptionalCustom({ default: 'https://...' })
  @IsString()
  url?: string;

  @ApiPropertyOptionalCustom({ description: 'Địa chỉ', default: '123 Đường ABC, Quận 1, TP.HCM' })
  @IsString()
  address?: string;

  @ApiPropertyOptionalCustom({
    description: 'Địa chỉ tạm',
    default: '123 Đường ABC, Quận 1, TP.HCM',
  })
  @IsString()
  tempAddress?: string;

  @ApiPropertyOptionalCustom({ enum: Gender, description: 'Giới tính', default: Gender.MALE })
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ enum: UserType, description: 'Loại người dùng', default: UserType.ADMIN })
  @IsEnum(UserType)
  type: UserType;

  @ApiPropertyOptionalCustom({ description: 'Mật khẩu (chỉ tạo user nội bộ)', default: '123456' })
  @IsString()
  password?: string;

  @ApiPropertyOptionalCustom({ description: 'Ngày onboard dạng ISO string' })
  @IsDate()
  dateOnboard?: Date;

  @ApiPropertyOptionalCustom({
    description: 'Trạng thái chính thức',
    default: UserOfficialStatus.OFFICIAL,
  })
  @IsEnum(UserOfficialStatus)
  officialStatus?: UserOfficialStatus;

  @ApiPropertyOptionalCustom({
    enum: UserLevel,
    description: 'Cấp bậc',
    default: UserLevel.EMPLOYEE,
  })
  @IsEnum(UserLevel)
  level?: UserLevel;

  @ApiPropertyOptionalCustom({ description: 'Số điện thoại nội bộ', default: '0901234567' })
  @IsString()
  internalPhone?: string;

  @ApiPropertyOptionalCustom({
    enum: UserEducationLevel,
    description: 'Trình độ đào tạo',
    default: UserEducationLevel.NONE,
  })
  @IsEnum(UserEducationLevel)
  educationLevel?: UserEducationLevel;

  @ApiPropertyOptionalCustom({ description: 'Chuyên môn', default: 'Chuyên môn' })
  @IsString()
  major?: string;

  @ApiPropertyOptionalCustom({
    enum: UserCultureLevel,
    description: 'Trình độ văn hóa',
    default: UserCultureLevel.NONE,
  })
  @IsEnum(UserCultureLevel)
  cultureLevel?: UserCultureLevel;

  @ApiPropertyOptionalCustom({
    description: 'Ngày nghỉ việc',
    default: new Date(),
  })
  @IsDate()
  dateResign?: Date;

  @ApiPropertyOptionalCustom({
    enum: UserResignType,
    description: 'Loại nghỉ',
    default: UserResignType.RESIGN_BY_REQUEST,
  })
  @IsEnum(UserResignType)
  resignType?: UserResignType;

  @ApiPropertyOptionalCustom({ description: 'Lý do nghỉ', default: 'Lý do nghỉ' })
  @IsString()
  resignReason?: string;

  @ApiPropertyOptionalCustom({ description: 'Ngày cấp CCCD', default: new Date() })
  @IsDate()
  citizenIdentificationDate?: Date;

  @ApiPropertyOptionalCustom({
    enum: UserCitizenIdentificationPlace,
    description: 'Nơi cấp CCCD',
    default: UserCitizenIdentificationPlace.CUS,
  })
  @IsEnum(UserCitizenIdentificationPlace)
  citizenIdentificationPlace?: UserCitizenIdentificationPlace;

  @ApiPropertyOptionalCustom({ description: 'Số hộ chiếu', default: '1234567890' })
  @IsString()
  passportNumber?: string;

  @ApiPropertyOptionalCustom({ description: 'Ngày cấp hộ chiếu', default: new Date() })
  @IsDate()
  passportDate?: Date;

  @ApiPropertyOptionalCustom({
    description: 'Nơi cấp hộ chiếu',
    default: '123 Đường ABC, Quận 1, TP.HCM',
  })
  @IsString()
  passportPlace?: string;

  @ApiPropertyOptionalCustom({ description: 'Hiệu lực tới ngày', default: new Date() })
  @IsDate()
  passportValidityDate?: Date;

  @ApiPropertyOptionalCustom({
    enum: UserEthnic,
    description: 'Dân tộc',
    default: UserEthnic.KINH,
  })
  @IsEnum(UserEthnic)
  ethnicity?: UserEthnic;

  @ApiPropertyOptionalCustom({
    enum: UserReligion,
    description: 'Tôn giáo',
    default: UserReligion.KHONG_TON_GIAO,
  })
  @IsEnum(UserReligion)
  religion?: UserReligion;

  @ApiPropertyOptionalCustom({
    enum: UserMaritalStatus,
    description: 'Tình trạng hôn nhân',
    default: UserMaritalStatus.SINGLE,
  })
  @IsEnum(UserMaritalStatus)
  maritalStatus?: UserMaritalStatus;

  @ApiPropertyOptionalCustom({ description: 'Mã số thuế', default: '1234567890' })
  @IsString()
  taxCode?: string;

  @ApiPropertyOptionalCustom({ description: 'Số sổ BHXH', default: '1234567890' })
  @IsString()
  socialInsuranceNumber?: string;

  @ApiPropertyOptionalCustom({ description: 'Số TK ngân hàng', default: '1234567890' })
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptionalCustom({ description: 'Tên ngân hàng', default: UserBankName.AGRIBANK })
  @IsEnum(UserBankName)
  bankName?: UserBankName;

  @ApiPropertyOptionalCustom({ description: 'Chi nhánh ngân hàng', default: 'Chi nhánh ngân hàng' })
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptionalCustom({ description: 'Thâm niên', default: 0 })
  @IsNumber()
  tenure?: number;

  @ApiPropertyOptionalCustom({ description: 'Tên người thân', default: 'Tên người thân' })
  @IsString()
  relativeName?: string;

  @ApiPropertyOptionalCustom({ description: 'Số điện thoại người thân', default: '0901234567' })
  @IsString()
  relativePhone?: string;
}
