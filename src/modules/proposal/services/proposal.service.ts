import { ProjectTaskProposalService } from '@/modules/project-task/service/project-task-proposal.service';
import { Injectable } from '@nestjs/common';
import { GetListProposalDto } from '../dtos/get-list-proposal.dto';
import { ProposalSearchType, ProposalType } from '../proposal.enum';
import { UserMovementService } from '@/modules/user/services/user-movement.service';
import { UserRequest } from '@/common/interfaces/user-request.type';
import {
  UserMovementSearchType,
  UserMovementStatus,
  UserMovementType,
} from '@/modules/user/user.enum';
import {
  ProjectTaskProposalFilterType,
  ProjectTaskProposalStatus,
  ProjectTaskProposalType,
} from '@/modules/project-task/project-task.enum';
import { JobRecruitmentService } from '@/modules/job/services/job-recruitment.service';
import { JobApproverStatus } from '@/modules/job/job.enum';
import { UpdateFollowerDto } from '../dtos/update-follower.dto';
@Injectable()
export class ProposalService {
  constructor(
    private readonly projectTaskProposalService: ProjectTaskProposalService,

    private readonly userMovementService: UserMovementService,

    private readonly jobRecruitmentService: JobRecruitmentService,
  ) {}

  async getListProposal(query: GetListProposalDto, user: UserRequest) {
    const { type, requestType, searchType, status, ...rest } = query;

    const statusValue = (status as string) === ProposalSearchType.ALL ? null : status;

    switch (type) {
      case ProposalType.PROJECT_PROPOSAL:
        return this.projectTaskProposalService.getListProjectTaskProposalOverview(user, {
          ...rest,
          type: requestType as unknown as ProjectTaskProposalType,
          searchType: searchType as unknown as ProjectTaskProposalFilterType,
          status: statusValue as unknown as ProjectTaskProposalStatus,
        });
      case ProposalType.USER_MOVEMENT:
        return this.userMovementService.getListUserMovementByManager(
          {
            ...rest,
            searchType: searchType as unknown as UserMovementSearchType,
            type: requestType as unknown as UserMovementType,
            status: statusValue as unknown as UserMovementStatus,
          },
          user,
        );
      case ProposalType.JOB_RECRUITMENT:
        return this.jobRecruitmentService.getListNeedApproveByUser(
          {
            ...rest,
            status: statusValue as unknown as JobApproverStatus,
          },
          user,
        );
      default:
        return;
    }
  }

  async updateFollowerForProposal(body: UpdateFollowerDto, user: UserRequest) {
    const { type, entityId, followerIds } = body;

    switch (type) {
      case ProposalType.PROJECT_PROPOSAL:
        return await this.projectTaskProposalService.updateProjectTaskProposalFollower(
          entityId,
          { followerIds },
          user,
        );
      case ProposalType.USER_MOVEMENT:
        return await this.userMovementService.addUserFollowers(
          { userIds: followerIds, userMovementId: entityId },
          user,
        );
      default:
        return;
    }
  }
}
