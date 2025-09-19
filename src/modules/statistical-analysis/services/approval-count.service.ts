import { UserRequest } from '@/common/interfaces/user-request.type';
import { Job } from '@/modules/job/entities/job.entity';
import { UserMovementApprover } from '@/modules/user/entities/user-movement-approve.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { UserMovementStatus, UserType } from '@/modules/user/user.enum';
import { JobApprover } from '@/modules/job/entities/job-approver.entity';
import { JobApproverStatus, JobStatus } from '@/modules/job/job.enum';
import { OrgUnitService } from '@/modules/org-unit/services/org-unit.service';
import { ProjectTaskProposalApprover } from '@/modules/project-task/entities/project-task-proposal-approver.entity';
import { ProjectTaskProposalStatus } from '@/modules/project-task/project-task.enum';

@Injectable()
export class ApprovalCountService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(ProjectTaskProposalApprover)
    private readonly projectTaskProposalApproverRepo: Repository<ProjectTaskProposalApprover>,

    @InjectRepository(UserMovementApprover)
    private readonly userMovementApproverRepo: Repository<UserMovementApprover>,

    @InjectRepository(JobApprover)
    private readonly jobApproverRepo: Repository<JobApprover>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly orgUnitService: OrgUnitService,
  ) {}

  async getListApprovalCounts(user: UserRequest) {
    const foundUser = await this.userRepo.findOne({
      where: { id: user.id },
      select: ['id', 'type'],
    });

    if (!foundUser) {
      return [];
    }

    const listOrgUnitManager = await this.orgUnitService.getManagedDepartmentsByUser(user);

    const listOrgUnitManagerIds = listOrgUnitManager.map((o) => o.id);

    if (listOrgUnitManagerIds.length === 0) {
      return { total: 0, list: [] };
    }

    const [countProposal, countMovement, countJob, countRecruitment] = await Promise.all([
      this.projectTaskProposalApproverRepo.count({
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

    return {
      movement: countMovement,
      approve_list: countProposal,
      approve: countJob,
      recruitment: countRecruitment,
    };
  }
}
