import { Entity, Column, OneToMany } from 'typeorm';
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
  UserStatus,
  UserType,
} from '../user.enum';
import { BaseEntity } from '@/common/entities/base.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from './user-unit-position.entity';
import { JobApprover } from '@/modules/job/entities/job-approver.entity';
import { UserMovementApprover } from './user-movement-approve.entity';
import { UserMovement } from './user-movement.entity';
import { UserMovementNotify } from './user-movement-notify.entity';
import { SubManager } from './sub-manager.entity';
import { UserDeletedValue } from '../interfaces/user.interface';
import { ProjectTaskProposalApprover } from '@/modules/project-task/entities/project-task-proposal-approver.entity';
import { ProjectTaskProposalFollower } from '@/modules/project-task/entities/project-task-proposal-follower.entity';

@Entity()
export class User extends BaseEntity {
  // ************** Thông tin làm việc	**************
  @Column({ unique: true, nullable: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', nullable: true, enum: Gender })
  gender: Gender;

  @Column({ type: 'timestamp', nullable: true })
  dateOnboard: Date;

  @Column({ comment: 'Email cá nhân' })
  email: string;

  @Column({ nullable: true, comment: 'Số điện thoại nội bộ' })
  internalPhone: string;

  // ************** Thông tin cơ bản *************
  @Column({ nullable: true, comment: 'Số điện thoại cá nhân' })
  phone: string;

  @Column({ nullable: true, type: 'enum', enum: UserLevel, comment: 'Cấp bậc' })
  level: UserLevel;

  @Column({ type: 'datetime', nullable: true })
  birthday: Date;

  @Column({ type: 'text', nullable: true, comment: 'Địa chỉ thường trú' })
  address: string;

  @Column({ type: 'text', nullable: true, comment: 'Địa chỉ tạm trú' })
  tempAddress: string;

  // ************** Thông tin cơ bản/ Trình độ văn hóa *************
  @Column({ nullable: true, type: 'enum', enum: UserEducationLevel, comment: 'Trình độ đào tạo' })
  educationLevel: UserEducationLevel;

  @Column({ nullable: true, comment: 'Chuyên môn' })
  major: string;

  @Column({ nullable: true, type: 'enum', enum: UserCultureLevel, comment: 'Trình độ văn hóa' })
  cultureLevel: UserCultureLevel;

  // ************** Thông tin cơ bản/ Nghỉ việc *************
  @Column({ type: 'datetime', nullable: true, comment: 'Ngày nghỉ việc' })
  dateResign: Date;

  @Column({ nullable: true, type: 'enum', enum: UserResignType, comment: 'Loại nghỉ' })
  resignType: UserResignType;

  @Column({ nullable: true, comment: 'Lý do nghỉ' })
  resignReason: string;

  // ************** Thông tin cơ bản/ CCCD *************
  @Column({ nullable: true })
  cccd: string;

  @Column({ type: 'datetime', nullable: true, comment: 'Ngày cấp CCCD' })
  citizenIdentificationDate: Date;

  //Nơi cấp CCCD
  @Column({
    nullable: true,
    type: 'enum',
    enum: UserCitizenIdentificationPlace,
    comment: 'Nơi cấp CCCD',
  })
  citizenIdentificationPlace: UserCitizenIdentificationPlace;

  // ************** Thông tin mở rộng/ Hộ chiếu *************
  @Column({ nullable: true, comment: 'Số hộ chiếu' })
  passportNumber: string;

  @Column({ type: 'datetime', nullable: true, comment: 'Ngày cấp hộ chiếu' })
  passportDate: Date;

  @Column({ nullable: true, type: 'text', comment: 'Nơi cấp hộ chiếu' })
  passportPlace: string;

  //Hiệu lực tới ngày
  @Column({ type: 'datetime', nullable: true, comment: 'Hiệu lực tới ngày' })
  passportValidityDate: Date;

  // ************** Thông tin mở rộng *************
  @Column({ nullable: true, type: 'enum', enum: UserEthnic, comment: 'Dân tộc' })
  ethnicity: UserEthnic;

  @Column({ nullable: true, type: 'enum', enum: UserReligion, comment: 'Tôn giáo' })
  religion: UserReligion;

  @Column({ nullable: true, type: 'enum', enum: UserMaritalStatus, comment: 'Tình trạng hôn nhân' })
  maritalStatus: UserMaritalStatus;

  @Column({ nullable: true, comment: 'Mã số thuế' })
  taxCode: string;

  @Column({ nullable: true, comment: 'Số sổ BHXH' })
  socialInsuranceNumber: string;

  @Column({ nullable: true, comment: 'Số TK ngân hàng' })
  bankAccountNumber: string;

  @Column({ nullable: true, comment: 'Chi nhánh ngân hàng' })
  bankBranch: string;

  @Column({ nullable: true, type: 'enum', enum: UserBankName, comment: 'Tên ngân hàng' })
  bankName: UserBankName;

  @Column({ nullable: true, comment: 'Thâm niên' })
  tenure: number;

  // ************** Thông tin mở rộng/ Thông tin liên hệ khi cần thiết *************

  @Column({ nullable: true, comment: 'Tên người thân' })
  relativeName: string;

  @Column({ nullable: true, comment: 'Số điện thoại người thân' })
  relativePhone: string;

  // ************** Thông tin mỡ rộng / web app *************
  @Column({ type: 'text', nullable: true })
  url: string;

  @Column({ type: 'enum', enum: UserType })
  type: UserType;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ nullable: true, select: false })
  password: string;

  @Column({ type: 'enum', enum: UserOfficialStatus, default: UserOfficialStatus.OFFICIAL })
  officialStatus: UserOfficialStatus;

  @Column({ type: 'json', nullable: true, comment: 'Lịch sử khi xóa' })
  deletedValue: UserDeletedValue;

  @OneToMany(() => UserOrgUnitPosition, (e) => e.user)
  userOrgUnitPositions: UserOrgUnitPosition[];

  @OneToMany(() => OrgUnit, (e) => e.manager)
  managedOrgUnits: OrgUnit[];

  @OneToMany(() => ProjectTaskProposalApprover, (e) => e.approver)
  projectTaskProposalApprovers: ProjectTaskProposalApprover[];

  @OneToMany(() => ProjectTaskProposalFollower, (e) => e.follower)
  projectTaskProposalFollowers: ProjectTaskProposalFollower[];

  @OneToMany(() => JobApprover, (e) => e.approver)
  jobApprovers: JobApprover[];

  @OneToMany(() => UserMovementApprover, (e) => e.approver)
  userApprovers: UserMovementApprover[];

  @OneToMany(() => UserMovement, (userMovement) => userMovement.user)
  userMovements: UserMovement[];

  @OneToMany(() => UserMovementNotify, (userMovementNotify) => userMovementNotify.user)
  userNotifications: UserMovementNotify[];

  @OneToMany(() => SubManager, (subManager) => subManager.user)
  subManagers: SubManager[];
}
