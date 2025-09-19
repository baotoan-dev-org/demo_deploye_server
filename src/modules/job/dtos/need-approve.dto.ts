import { Expose, Transform, Type } from 'class-transformer';
import { JobApproverStatus, JobPriority, JobType, RecruitmentReason } from '../job.enum';

export class UserInfoDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  url: string;
}

export class ApproverDto{
  @Expose()
  approverId: string;

  @Expose()
  status: JobApproverStatus;

  @Expose()
  opinion: string;

  @Expose()
  reasonReject: string;

  @Expose()
  @Type(() => UserInfoDto)
  approver: UserInfoDto;

}

export class JobNeedApproveDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  quantity: number;

  @Expose()
  minExpectedSalary: number;

  @Expose()
  maxExpectedSalary: number;

  @Expose()
  type: JobType;

  @Expose()
  recruitmentReason: RecruitmentReason;

  @Expose()
  status: JobApproverStatus;

  @Expose()
  priority: JobPriority;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => ApproverDto) 
  jobApprovers: ApproverDto[];

}

export class UserOrgUnitPositionDto {
  @Expose()
  @Transform(({ obj }) =>
    obj.orgUnit
      ? {
          id: obj.orgUnit.id,
          name: obj.orgUnit.name,
        }
      : null,
  )
  orgUnit: { id: string; name: string } | null;

  @Expose()
  @Transform(({ obj }) =>
    obj.position
      ? {
          id: obj.position.id,
          name: obj.position.name,
        }
      : null,
  )
  position: { id: string; name: string } | null;
}

export class NeedApproveDto {
  @Expose()
  id: string;

  @Expose()
  @Transform(({ value, obj }) => value ?? obj.job?.name ?? '')
  title: string;

  @Expose()
  @Transform(({ value, obj }) => value ?? obj.job?.quantity ?? 0)
  quantity: number;

  @Expose()
  status: JobApproverStatus;

  @Expose()
  opinion: string;

  @Expose()
  reasonReject: string;

  @Expose()
  @Type(() => JobNeedApproveDto)
  job: JobNeedApproveDto;

  @Expose()
  createdAt: Date;

  @Expose()
  @Transform(({ value, obj }) => {
    const createdBy = value ?? obj.job?.createdBy;
    return createdBy
      ? {
          id: createdBy.id,
          name: createdBy.name,
          url: createdBy.url,
        }
      : null;
  })
  createdBy: UserInfoDto;

  @Expose()
  @Type(() => UserOrgUnitPositionDto)
  userOrgUnitPosition: UserOrgUnitPositionDto;
}

