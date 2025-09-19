import { Injectable } from '@nestjs/common';
import { SidebarPath } from '../system.enum';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { JobApprover } from '@/modules/job/entities/job-approver.entity';
import { Job } from '@/modules/job/entities/job.entity';
import { JobApproverStatus, JobStatus } from '@/modules/job/job.enum';
import { OrgUnitService } from '@/modules/org-unit/services/org-unit.service';
import { UserMovementApprover } from '@/modules/user/entities/user-movement-approve.entity';
import { UserMovementStatus } from '@/modules/user/user.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { ProjectTaskProposalApprover } from '@/modules/project-task/entities/project-task-proposal-approver.entity';
import { ProjectTaskProposalStatus } from '@/modules/project-task/project-task.enum';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(ProjectTaskProposalApprover)
    private readonly proposalApproverRepo: Repository<ProjectTaskProposalApprover>,

    @InjectRepository(UserMovementApprover)
    private readonly userMovementApproverRepo: Repository<UserMovementApprover>,

    @InjectRepository(JobApprover)
    private readonly jobApproverRepo: Repository<JobApprover>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly orgUnitService: OrgUnitService,
  ) {}

  async getSidebarCountObj(user: UserRequest) {
    const sidebarCountObj: Partial<Record<SidebarPath, number>> = {};

    const foundUser = await this.userRepo.findOne({
      where: { id: user.id },
      select: ['id', 'type'],
    });

    if (!foundUser) return sidebarCountObj;

    const listOrgUnitManager = await this.orgUnitService.getManagedDepartmentsByUser(user);

    const listOrgUnitManagerIds = listOrgUnitManager.map((o) => o.id);

    if (listOrgUnitManagerIds.length === 0) return sidebarCountObj;

    const [
      proposalsProjectTaskCount,
      proposalsUserTransferCount,
      proposalsJobRecruitmentCount,
      jobRecruitmentCount,
    ] = await Promise.all([
      this.proposalApproverRepo.count({
        where: { approverId: foundUser.id, status: ProjectTaskProposalStatus.PENDING },
      }),
      this.userMovementApproverRepo.count({
        where: { approverId: foundUser.id, status: UserMovementStatus.PENDING },
      }),
      this.jobApproverRepo.count({
        where: { approverId: foundUser.id, status: JobApproverStatus.PENDING },
      }),
      this.jobRepo.count({
        where: {
          status: JobStatus.APPROVED,
          orgUnitId: In(listOrgUnitManagerIds),
        },
      }),
    ]);

    sidebarCountObj[SidebarPath.PROPOSAL_PROJECT_TASK] = proposalsProjectTaskCount;
    sidebarCountObj[SidebarPath.PROPOSAL_USER_TRANSFER] = proposalsUserTransferCount;
    sidebarCountObj[SidebarPath.PROPOSAL_JOB_RECRUITMENT] = proposalsJobRecruitmentCount;
    sidebarCountObj[SidebarPath.JOB_RECRUITMENT] = jobRecruitmentCount;

    return sidebarCountObj;
  }
}
