import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  In,
  Repository,
  Not,
  EntityManager,
} from 'typeorm';
import { ProjectTask } from '@/modules/project-task/entities/project-task.entity';
import { User } from '@/modules/user/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { ProjectTaskAssigneeService } from '@/modules/project-task/service/project-task-assignee.service';
import { ProjectTaskService } from '@/modules/project-task/service/project-task.service';
import { QueryService } from '@/common/services/query.service';
import { OtherService } from '@/modules/other/services/other.service';
import { CodeConfigType } from '@/modules/other/other.enum';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { ProjectTaskDependencyService } from '@/modules/project-task/service/project-task-dependency.service';
import { NotificationType } from '@/modules/notification/notification.enum';
import { UserRequest } from '@/common/interfaces/user-request.type';
import {
  ProjectTaskAssigneeType,
  ProjectTaskHistoryAction,
  ProjectTaskProposalFilterType,
  ProjectTaskProposalStatus,
  ProjectTaskProposalType,
  ProjectTaskType,
  ProjectTaskUpdateAssigneeType,
} from '@/modules/project-task/project-task.enum';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserType } from '@/modules/user/user.enum';
import { PROGRESS_COMPLETE } from '@/modules/project-task/project-task.constant';
import { ProjectTaskHistory } from '@/modules/project-task/entities/project-task-history.entity';
import { TimeService } from '@/common/services/time.service';
import { AttachFollowerDto } from '../dtos/attach-follower.dto';
import { ProjectTaskProposalApprover } from '../entities/project-task-proposal-approver.entity';
import { ProjectTaskProposalFollower } from '../entities/project-task-proposal-follower.entity';
import { ProjectTaskProposal } from '../entities/project-task-proposal.entity';
import {
  ProjectTaskProposalChangeAssigneeValue,
  ProjectTaskProposalChangeOrgUnitValue,
  ProjectTaskProposalDeadlineValue,
  ProjectTaskProposalValue,
} from '../interfaces/project-task-proposal.interface';
import { GetListProjectTaskProposalDto } from '../dtos/get-list-project-task-proposal.dto';
import { ProjectTaskHandle } from '../project-task.handle';
import { CreateProjectTaskProposalDto } from '../dtos/create-project-task-proposal.dto';
import { UpdateProjectTaskProposalDto } from '../dtos/update-project-task-proposal.dto';
import { UpdateProjectTaskProposalStatusDto } from '../dtos/update-project-task-proposal-status.dto';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
@Injectable()
export class ProjectTaskProposalService {
  constructor(
    @InjectRepository(ProjectTaskProposal)
    private readonly projectTaskProposalRepo: Repository<ProjectTaskProposal>,

    @InjectRepository(ProjectTask)
    private readonly projectTaskRepo: Repository<ProjectTask>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: Repository<OrgUnit>,

    @InjectRepository(ProjectTaskProposalApprover)
    private readonly projectTaskProposalApproverRepo: Repository<ProjectTaskProposalApprover>,

    @InjectRepository(ProjectTaskProposalFollower)
    private readonly projectTaskProposalFollowerRepo: Repository<ProjectTaskProposalFollower>,

    @InjectRepository(UserOrgUnitPosition)
    private readonly userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

    private readonly dataSource: DataSource,

    private readonly projectTaskAssigneeService: ProjectTaskAssigneeService,

    private readonly projectTaskService: ProjectTaskService,

    private readonly queryService: QueryService,

    private readonly otherService: OtherService,

    private readonly notificationService: NotificationService,

    private readonly projectTaskDependencyService: ProjectTaskDependencyService,

    private readonly projectTaskHandle: ProjectTaskHandle,

    private readonly timeService: TimeService,
  ) {}

  async fixData() {
    await this.dataSource.transaction(async (manager) => {
      // Xóa dữ liệu 3 bảng mới trước khi migrate
      await manager.query('DELETE FROM project_task_proposal_follower');
      await manager.query('DELETE FROM project_task_proposal_approver');
      await manager.query('DELETE FROM project_task_proposal');

      // 1. Lấy toàn bộ proposal cũ bằng query thô
      const oldProposals = await manager.query('SELECT * FROM proposal');
      const oldApprovers = await manager.query('SELECT * FROM proposal_approver');
      const oldFollowers = await manager.query('SELECT * FROM proposal_follower');

      for (const old of oldProposals) {
        // Tạo proposal mới
        const newProposal = manager.create(ProjectTaskProposal, {
          code: old.code,
          title: old.title,
          type: old.type,
          amount: old.amount,
          progress: old.progress,
          currencyBudget: old.currencyBudget,
          currency: old.currency,
          exchangeRate: old.exchangeRate,
          oldValue: old.oldValue,
          newValue: old.newValue,
          reason: old.reason,
          delayReasons: old.delayReasons,
          reasonReject: old.reasonReject,
          attachments: old.attachments,
          progressAtRequest: old.progressAtRequest,
          status: old.status,
          projectTaskId: old.projectTaskId,
          createdById: old.createdById,
          updatedById: old.updatedById,
          createdAt: old.createdAt,
          updatedAt: old.updatedAt,
        });
        const savedProposal = await manager.save(ProjectTaskProposal, newProposal);

        // 2. Di chuyển approvers
        const approvers = oldApprovers.filter((a) => a.proposalId === old.id);

        for (const approver of approvers) {
          const newApprover = manager.create(ProjectTaskProposalApprover, {
            status: approver.status,
            reasonReject: approver.reasonReject,
            approvedAt: approver.approvedAt,
            proposalId: savedProposal.id,
            approverId: approver.approverId,
            createdById: approver.createdById,
            updatedById: approver.updatedById,
            updatedAt: approver.updatedAt,
          });
          await manager.save(ProjectTaskProposalApprover, newApprover);
        }

        // 3. Di chuyển followers
        const followers = oldFollowers.filter((f) => f.proposalId === old.id);
        for (const follower of followers) {
          const newFollower = manager.create(ProjectTaskProposalFollower, {
            proposalId: savedProposal.id,
            followerId: follower.followerId,
          });
          await manager.save(ProjectTaskProposalFollower, newFollower);
        }
      }
    });
    return { success: true };
  }

  async getCombinedDelayReasons(parentId: string | null, manager: EntityManager) {
    if (!parentId) return [];
    const children = await manager.find(ProjectTask, {
      where: { parentId },
      select: ['delayReasons'],
    });
    const allReasons = new Set<string>();
    children.forEach((c) => {
      if (Array.isArray(c.delayReasons)) {
        c.delayReasons.forEach((r) => allReasons.add(r));
      }
    });
    return Array.from(allReasons);
  }

  async saveDelayReasonsRecursively(projectTaskId: string | null, manager: EntityManager) {
    if (!projectTaskId) return;
    const combinedReasons = await this.getCombinedDelayReasons(projectTaskId, manager);
    const currentTask = await manager.findOne(ProjectTask, {
      where: { id: projectTaskId },
      select: ['id', 'parentId', 'delayReasons'],
    });
    if (!currentTask) return;
    await manager.save(ProjectTask, {
      id: currentTask.id,
      delayReasons: combinedReasons,
    });
    if (currentTask.parentId) await this.saveDelayReasonsRecursively(currentTask.parentId, manager);
  }

  async handleProjectTaskProposalApproved(
    proposal: ProjectTaskProposal,
    user: UserRequest,
    manager: EntityManager,
  ) {
    const logHistory = async (params: { oldValue; newValue; changedFields: string[] }) => {
      await manager.save(ProjectTaskHistory, {
        oldValue: params.oldValue,
        newValue: params.newValue,
        action: ProjectTaskHistoryAction.UPDATE,
        projectTaskId: proposal.projectTaskId,
        type: proposal?.projectTask?.type,
        changedFields: params.changedFields,
        createdById: user.id,
      });
    };

    switch (proposal.type) {
      case ProjectTaskProposalType.EXTEND_DEADLINE: {
        const { oldEndDate, oldEstimateDate } =
          proposal.oldValue as ProjectTaskProposalDeadlineValue;
        const { newEndDate, newEstimateDate } =
          proposal.newValue as ProjectTaskProposalDeadlineValue;
        const newEnd = new Date(newEndDate);
        const oldEnd = new Date(oldEndDate);
        const newEstimate = new Date(newEstimateDate);
        const oldEstimate = new Date(oldEstimateDate);

        if (newEnd < newEstimate)
          throw new BadRequestException('Ngày kết thúc không được nhỏ hơn ngày ước tính');
        if (newEnd < oldEnd)
          throw new BadRequestException('Ngày kết thúc mới không được nhỏ hơn ngày kết thúc cũ');
        if (newEstimate < oldEstimate)
          throw new BadRequestException('Ngày ước tính mới không được nhỏ hơn ngày ước tính cũ');

        const oldTask = await manager.findOne(ProjectTask, {
          where: { id: proposal.projectTaskId },
        });

        await manager.update(
          ProjectTask,
          { id: proposal.projectTaskId },
          {
            endDate: newEnd,
            estimateDate: newEstimate,
            delayReasons: proposal.delayReasons,
          },
        );
        const newTask = await manager.findOne(ProjectTask, {
          where: { id: proposal.projectTaskId },
        });
        await this.projectTaskDependencyService.propagateTimeToParentsUpstream(
          proposal.projectTaskId,
          newEnd,
        );
        await this.projectTaskDependencyService.propagateTimeToDependents(
          proposal.projectTaskId,
          newEnd,
        );

        if (proposal.delayReasons)
          await this.saveDelayReasonsRecursively(oldTask.parentId, manager);

        const changedFields: string[] = [];

        if (this.timeService.compareDateField(oldTask?.endDate, newTask?.endDate))
          changedFields.push('endDate');

        if (this.timeService.compareDateField(oldTask?.estimateDate, newTask?.estimateDate))
          changedFields.push('estimateDate');

        if (changedFields.length > 0) {
          const filteredOld: Record<string, any> = {};
          const filteredNew: Record<string, any> = {};
          if (changedFields.includes('endDate')) {
            filteredOld['endDate'] = oldTask?.endDate;
            filteredNew['endDate'] = newTask?.endDate;
          }
          if (changedFields.includes('estimateDate')) {
            filteredOld['estimateDate'] = oldTask?.estimateDate;
            filteredNew['estimateDate'] = newTask?.estimateDate;
          }
          await logHistory({ oldValue: filteredOld, newValue: filteredNew, changedFields });
        }
        break;
      }
      case ProjectTaskProposalType.CHANGE_ASSIGNEE: {
        const oldAssignee = proposal.oldValue as ProjectTaskProposalChangeAssigneeValue;
        const newAssignee = proposal.newValue as ProjectTaskProposalChangeAssigneeValue;
        await this.projectTaskAssigneeService.updateProjectTaskAssignee(
          {
            userIds: newAssignee.replacementUser.map((u) => u.id),
            orgUnitIds: [],
            projectTaskId: proposal.projectTaskId,
          },
          ProjectTaskUpdateAssigneeType.USER,
          manager,
          {
            createdByUser: { id: user.id, name: user.name },
            projectTaskName: proposal?.projectTask?.name,
            notificationService: this.notificationService,
          },
        );
        await logHistory({
          oldValue: {
            assignees: oldAssignee.oldUser.map((u) => ({
              userId: u.id,
              userName: u.name,
              type: ProjectTaskAssigneeType.USER,
              orgUnitId: null,
            })),
          },
          newValue: {
            assignees: newAssignee.replacementUser.map((u) => ({
              userId: u.id,
              userName: u.name,
              type: ProjectTaskAssigneeType.USER,
              orgUnitId: null,
            })),
          },
          changedFields: ['assignees'],
        });
        break;
      }
      case ProjectTaskProposalType.CHANGE_ORG_UNIT: {
        const oldOrgUnit = proposal.oldValue as ProjectTaskProposalChangeOrgUnitValue;
        const newAssignee = proposal.newValue as ProjectTaskProposalChangeOrgUnitValue;
        const oldTaskAssignee = await manager.find(OrgUnit, {
          where: { id: In(oldOrgUnit.oldOrgUnit.map((u) => u.id)) },
        });
        const newTaskAssignee = await manager.find(OrgUnit, {
          where: { id: In(newAssignee.newOrgUnit.map((u) => u.id)) },
        });
        await this.projectTaskAssigneeService.updateProjectTaskAssignee(
          {
            userIds: newAssignee.newOrgUnit.map((u) => u.id),
            orgUnitIds: [],
            projectTaskId: proposal.projectTaskId,
          },
          ProjectTaskUpdateAssigneeType.ORG_UNIT,
          manager,
          {
            createdByUser: { id: user.id, name: user.name },
            projectTaskName: proposal?.projectTask?.name,
            notificationService: this.notificationService,
          },
        );
        await logHistory({
          oldValue: {
            assignees: oldTaskAssignee.map((u) => ({
              orgUnitId: u.id,
              orgUnitName: u.name,
              type: u.type,
              userId: null,
            })),
          },
          newValue: {
            assignees: newTaskAssignee.map((u) => ({
              orgUnitId: u.id,
              orgUnitName: u.name,
              type: u.type,
              userId: null,
            })),
          },
          changedFields: ['assignees'],
        });
        break;
      }
      case ProjectTaskProposalType.CANCEL:
        await this.projectTaskService.deleteProjectTask(proposal.projectTaskId, user);
        break;
      case ProjectTaskProposalType.BUDGET_APPROVAL: {
        const oldTask = await manager.findOne(ProjectTask, {
          where: { id: proposal.projectTaskId },
        });
        await this.projectTaskService.updateProjectTaskIsBudgetConfirmed(
          proposal.projectTaskId,
          true,
          user,
        );
        const newTask = await manager.findOne(ProjectTask, {
          where: { id: proposal.projectTaskId },
        });
        await logHistory({
          oldValue: oldTask,
          newValue: newTask,
          changedFields: ['isBudgetConfirmed'],
        });
        break;
      }
    }

    await this.projectTaskProposalRepo.update(
      { id: proposal.id },
      {
        status: ProjectTaskProposalStatus.APPROVED,
        updatedById: user.id,
        progress: PROGRESS_COMPLETE,
      },
    );

    if (proposal.type === ProjectTaskProposalType.BUDGET_APPROVAL) {
      await this.projectTaskRepo.update(
        { id: proposal.projectTaskId },
        {
          budget: proposal.amount,
          isBudgetConfirmed: true,
        },
      );
    }
  }

  async createProjectTaskProposal(dto: CreateProjectTaskProposalDto, user: UserRequest) {
    const {
      oldEndDate = null,
      oldEstimateDate = null,
      newEndDate = null,
      newEstimateDate = null,
      oldUserIds = [],
      replacementUserIds = [],
      oldOrgUnit = [],
      newOrgUnit = [],
      ...otherFields
    } = dto;

    const [projectTask, isTitleExist, code] = await Promise.all([
      otherFields.projectTaskId
        ? this.projectTaskRepo.findOne({
            where: { id: otherFields.projectTaskId },
            select: { id: true, name: true, progressPercent: true },
          })
        : null,
      this.projectTaskProposalRepo.exists({ where: { title: otherFields.title } }),
      this.otherService.generateCode(CodeConfigType.DX, 5, this.projectTaskProposalRepo.manager),
    ]);

    this.projectTaskHandle.errorNotExistProjectTask(otherFields.projectTaskId, projectTask);
    if (isTitleExist) throw new BadRequestException('Đề xuất với tiêu đề này đã tồn tại');
    if (
      projectTask.type === ProjectTaskType.PROJECT &&
      projectTask.parentId !== null &&
      !otherFields.delayReasons
    )
      throw new BadRequestException(
        'Lý do trì hoãn không được để trống khi đề xuất cho công việc con của dự án',
      );

    const mapUsers = async (ids: string[]) =>
      ids.length
        ? await this.userRepo.find({
            where: { id: In(ids) },
            select: { id: true, name: true, email: true },
          })
        : [];
    const mapOrgUnits = async (ids: string[]) =>
      ids.length
        ? (
            await this.orgUnitRepo.find({
              where: { id: In(ids) },
              select: { id: true, name: true, type: true },
            })
          ).map((ou) => ({ ...ou, type: String(ou.type) }))
        : [];

    let oldValue: ProjectTaskProposalValue = {};
    let newValue: ProjectTaskProposalValue = {};

    switch (dto.type) {
      case ProjectTaskProposalType.EXTEND_DEADLINE:
        oldValue = {
          oldEndDate: oldEndDate ? new Date(oldEndDate) : null,
          oldEstimateDate: oldEstimateDate ? new Date(oldEstimateDate) : null,
        };
        newValue = {
          newEndDate: newEndDate ? new Date(newEndDate) : null,
          newEstimateDate: newEstimateDate ? new Date(newEstimateDate) : null,
        };
        break;
      case ProjectTaskProposalType.CHANGE_ASSIGNEE: {
        const users = await mapUsers([...oldUserIds, ...replacementUserIds]);
        oldValue = { oldUser: users.filter((u) => oldUserIds.includes(u.id)) };
        newValue = { replacementUser: users.filter((u) => replacementUserIds.includes(u.id)) };
        break;
      }
      case ProjectTaskProposalType.CHANGE_ORG_UNIT: {
        const orgUnits = await mapOrgUnits([...oldOrgUnit, ...newOrgUnit]);
        oldValue = { oldOrgUnit: orgUnits.filter((ou) => oldOrgUnit.includes(ou.id)) };
        newValue = { newOrgUnit: orgUnits.filter((ou) => newOrgUnit.includes(ou.id)) };
        break;
      }
      default:
        break;
    }

    this.projectTaskHandle.errorCheckProjectTaskProposalValidation(
      dto.type,
      dto.amount,
      otherFields.projectTaskId ? projectTask.progressPercent : null,
      newValue,
      oldValue,
    );

    const proposalId = uuidv4();
    const proposalInsert: DeepPartial<ProjectTaskProposal> = {
      ...dto,
      id: proposalId,
      code,
      oldValue,
      newValue,
      progressAtRequest: projectTask ? projectTask.progressPercent : 0,
      createdById: user.id,
    };

    let needPostApprove = false;
    let postApproveProjectTaskProposal: ProjectTaskProposal | null = null;
    await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(ProjectTaskProposal, proposalInsert);
        if (projectTask.type === ProjectTaskType.PROJECT && projectTask.parentId === null) {
          await manager.update(
            ProjectTask,
            { id: projectTask.id },
            { delayReasons: otherFields.delayReasons },
          );
        }
        if (otherFields.approverIds?.length > 0) {
          const uniqueApproverIds = Array.from(new Set(otherFields.approverIds));
          const approverEntities = uniqueApproverIds.map((userId) => ({
            proposal: { id: proposalId },
            approver: { id: userId },
            status:
              userId === user.id
                ? ProjectTaskProposalStatus.APPROVED
                : ProjectTaskProposalStatus.PENDING,
            approvedAt: userId === user.id ? new Date() : undefined,
          }));

          await manager.insert(ProjectTaskProposalApprover, approverEntities);

          if (uniqueApproverIds.includes(user.id)) {
            const approvedCount = approverEntities.filter(
              (e) => e.status === ProjectTaskProposalStatus.APPROVED,
            ).length;
            const totalApprovers = approverEntities.length;
            await manager.update(
              ProjectTaskProposal,
              { id: proposalId },
              {
                progress:
                  totalApprovers > 0 ? Math.round((approvedCount / totalApprovers) * 100) : 0,
              },
            );
            if (totalApprovers === 1 && uniqueApproverIds[0] === user.id) {
              needPostApprove = true;
              postApproveProjectTaskProposal = proposalInsert as ProjectTaskProposal;
              if (dto.type === ProjectTaskProposalType.BUDGET_APPROVAL) {
                await manager.update(
                  ProjectTask,
                  { id: proposalInsert.projectTaskId },
                  { isBudgetConfirmed: true, budget: dto.amount ? dto.amount : 0 },
                );
              }
            }
          }

          await this.notificationService.createManyNotification({
            notification: {
              title: 'Đề xuất mới',
              content: `${user.name} đã tạo đề xuất mới cho công việc`,
              type: NotificationType.PROPOSAL,
              path: `/dashboard/proposals-project-task?proposalId=${proposalId}`,
              createdById: user.id,
              userIds: uniqueApproverIds,
            },
            isPushFCM: true,
            manager,
          });
        }

        if (otherFields.followerIds?.length > 0) {
          const uniqueFollowerIds = Array.from(new Set(otherFields.followerIds));
          const followerEntities = uniqueFollowerIds.map((userId) => ({
            proposal: { id: proposalId },
            follower: { id: userId },
          }));
          await manager.insert(ProjectTaskProposalFollower, followerEntities);

          await this.notificationService.createManyNotification({
            notification: {
              title: 'Theo dõi đề xuất',
              content: `${user.name} đã thêm bạn vào danh sách theo dõi đề xuất`,
              type: NotificationType.PROPOSAL,
              path: `/dashboard/proposals-project-task?proposalId=${proposalId}`,
              createdById: user.id,
              userIds: uniqueFollowerIds,
            },
            isPushFCM: true,
            manager,
          });
        }
      })
      .catch((err) => {
        console.log('err', err);
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });

    if (needPostApprove && postApproveProjectTaskProposal)
      await this.handleProjectTaskProposalApproved(
        postApproveProjectTaskProposal,
        user,
        this.dataSource.manager,
      );

    return { success: true };
  }

  async updateProjectTaskProposal(
    id: string,
    dto: UpdateProjectTaskProposalDto,
    user: UserRequest,
  ) {
    const {
      approverIds,
      followerIds,
      title,
      oldEndDate,
      oldEstimateDate,
      newEndDate,
      newEstimateDate,
      oldUserIds,
      replacementUserIds,
      ...otherFields
    } = dto;

    const [existsProjectTaskProposal, isTitleExist, existsProjectTask] = await Promise.all([
      this.projectTaskProposalRepo.findOne({
        where: { id },
        relations: ['projectTaskApprovers'],
        select: {
          id: true,
          createdById: true,
          status: true,
          projectTaskApprovers: {
            id: true,
            status: true,
          },
        },
      }),
      this.projectTaskProposalRepo.exists({ where: { title, id: Not(id) } }),
      otherFields.projectTaskId
        ? this.projectTaskRepo.findOne({
            where: { id: otherFields.projectTaskId },
            select: { id: true, name: true, progressPercent: true },
          })
        : null,
    ]);

    this.projectTaskHandle.errorNotFoundEntityWithId(
      existsProjectTaskProposal,
      ProjectTaskProposal.name,
      id,
    );

    if (isTitleExist) throw new BadRequestException('Đề xuất với tiêu đề này đã tồn tại');

    if (
      ![UserType.ADMIN, UserType.ROOT].includes(user.type) &&
      existsProjectTaskProposal.createdById !== user.id
    )
      throw new BadRequestException('Bạn không có quyền cập nhật đề xuất này');

    let oldValue: ProjectTaskProposalValue = {};
    let newValue: ProjectTaskProposalValue = {};

    switch (dto.type) {
      case ProjectTaskProposalType.EXTEND_DEADLINE:
        oldValue = {
          oldEndDate: oldEndDate ? new Date(oldEndDate) : null,
          oldEstimateDate: oldEstimateDate ? new Date(oldEstimateDate) : null,
        };
        newValue = {
          newEndDate: newEndDate ? new Date(newEndDate) : null,
          newEstimateDate: newEstimateDate ? new Date(newEstimateDate) : null,
        };
        break;
      case ProjectTaskProposalType.CHANGE_ASSIGNEE: {
        const allUserIds = [
          ...(oldUserIds && oldUserIds.length ? oldUserIds : []),
          ...(replacementUserIds && replacementUserIds.length ? replacementUserIds : []),
        ];
        let users: User[] = [];
        if (allUserIds.length > 0) {
          users = await this.userRepo.find({
            where: { id: In(allUserIds) },
            select: { id: true, name: true, email: true },
          });
        }
        oldValue = {
          oldUser:
            oldUserIds && oldUserIds.length ? users.filter((u) => oldUserIds.includes(u.id)) : [],
        };
        newValue = {
          replacementUser:
            replacementUserIds && replacementUserIds.length
              ? users.filter((u) => replacementUserIds.includes(u.id))
              : [],
        };
        break;
      }
      default:
        break;
    }

    this.projectTaskHandle.errorCheckProjectTaskProposalValidation(
      dto.type,
      dto.amount,
      otherFields.projectTaskId ? existsProjectTask.progressPercent : null,
      newValue,
      oldValue,
    );

    if (
      existsProjectTaskProposal.projectTaskApprovers &&
      existsProjectTaskProposal.projectTaskApprovers.some(
        (a) => a.status === ProjectTaskProposalStatus.APPROVED,
      ) &&
      existsProjectTaskProposal.status !== ProjectTaskProposalStatus.REJECTED
    )
      throw new BadRequestException('Không thể cập nhật đề xuất vì đã có người phê duyệt');

    if (existsProjectTaskProposal.status === ProjectTaskProposalStatus.APPROVED)
      throw new BadRequestException('Không thể cập nhật đề xuất đã được phê duyệt');

    const proposalUpdate: DeepPartial<ProjectTaskProposal> = {
      ...otherFields,
      updatedById: user.id,
      status: ProjectTaskProposalStatus.PENDING,
      oldValue,
      newValue,
    };

    let needPostApprove = false;
    let postApproveProjectTaskProposal: ProjectTaskProposal | null = null;
    await this.dataSource
      .transaction(async (manager) => {
        await manager.update(ProjectTaskProposal, { id }, proposalUpdate);
        await manager.delete(ProjectTaskProposalApprover, { proposal: { id } });
        if (approverIds?.length > 0) {
          const uniqueApproverIds = Array.from(new Set(approverIds));
          const approverEntities = uniqueApproverIds.map((userId) => ({
            proposal: { id },
            approver: { id: userId },
            status:
              userId === user.id
                ? ProjectTaskProposalStatus.APPROVED
                : ProjectTaskProposalStatus.PENDING,
            approvedAt: userId === user.id ? new Date() : undefined,
          }));

          await this.notificationService.createManyNotification({
            notification: {
              title: 'Đề xuất mới',
              content: `${user.name} đã tạo đề xuất mới cho công việc`,
              type: NotificationType.PROPOSAL,
              path: `/dashboard/proposals-project-task?proposalId=${id}`,
              createdById: user.id,
              userIds: uniqueApproverIds.filter((uid) => uid !== user.id),
            },
            isPushFCM: true,
            manager,
          });

          await manager.insert(ProjectTaskProposalApprover, approverEntities);

          if (
            uniqueApproverIds.length === 1 &&
            uniqueApproverIds[0] === user.id &&
            dto.type === ProjectTaskProposalType.BUDGET_APPROVAL
          ) {
            needPostApprove = true;
            postApproveProjectTaskProposal = existsProjectTaskProposal as ProjectTaskProposal;
            await manager.update(
              ProjectTask,
              { id: otherFields.projectTaskId },
              { isBudgetConfirmed: true, budget: dto.amount ? dto.amount : 0 },
            );
          }
        }

        if (followerIds && followerIds.length > 0) {
          const uniqueFollowerIds = Array.from(new Set(followerIds));
          const followerEntities = uniqueFollowerIds.map((userId) => ({
            proposal: { id },
            follower: { id: userId },
          }));

          await this.notificationService.createManyNotification({
            notification: {
              title: 'Theo dõi đề xuất',
              content: `${user.name} đã thêm bạn vào danh sách theo dõi đề xuất`,
              type: NotificationType.PROPOSAL,
              path: `/dashboard/proposals-project-task?proposalId=${id}`,
              createdById: user.id,
              userIds: uniqueFollowerIds,
            },
            isPushFCM: true,
            manager,
          });

          await manager.insert(ProjectTaskProposalFollower, followerEntities);
        }
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
    if (needPostApprove && postApproveProjectTaskProposal)
      await this.handleProjectTaskProposalApproved(
        postApproveProjectTaskProposal,
        user,
        this.dataSource.manager,
      );

    return { success: true };
  }

  async updateProjectTaskProposalStatus(
    id: string,
    dto: UpdateProjectTaskProposalStatusDto,
    user: UserRequest,
  ) {
    const { status, reasonReject } = dto;
    const proposal = await this.projectTaskProposalRepo.findOne({
      where: { id },
      relations: ['projectTaskApprovers.approver', 'createdBy'],
      select: {
        id: true,
        type: true,
        amount: true,
        progress: true,
        projectTaskId: true,
        newValue: true,
        oldValue: true,
        delayReasons: true,
        createdBy: { id: true },
      },
    });
    this.projectTaskHandle.errorNotFoundEntityWithId(proposal, ProjectTaskProposal.name, id);

    const approver = proposal.projectTaskApprovers.find((a) => a?.approver?.id === user.id);
    if (!approver) throw new BadRequestException('Bạn không có quyền phê duyệt đề xuất này');

    if (approver.status !== ProjectTaskProposalStatus.PENDING)
      throw new BadRequestException('Bạn đã phê duyệt hoặc từ chối đề xuất này trước đó');

    if (status === ProjectTaskProposalStatus.REJECTED && !reasonReject)
      throw new BadRequestException('Lý do từ chối không được để trống');

    let needPostApprove = false;
    let postApproveProjectTaskProposal: ProjectTaskProposal | null = null;
    await this.dataSource
      .transaction(async (manager) => {
        await manager.update(
          ProjectTaskProposalApprover,
          { id: approver.id },
          {
            status,
            reasonReject: status === ProjectTaskProposalStatus.REJECTED ? reasonReject : null,
            approvedAt: status === ProjectTaskProposalStatus.APPROVED ? new Date() : null,
          },
        );

        const updatedApprovers = await manager.find(ProjectTaskProposalApprover, {
          where: { proposalId: id },
          relations: ['approver'],
          select: {
            id: true,
            status: true,
            approver: {
              id: true,
              name: true,
              email: true,
            },
          },
        });

        const approverUserIds = updatedApprovers.map((a) => a.approver?.id).filter(Boolean);
        const notifyUserIds = Array.from(
          new Set([proposal.createdBy?.id, ...approverUserIds].filter(Boolean)),
        ).filter((uid) => uid !== user.id);

        const totalApprovers = updatedApprovers.length;
        const approvedCount = updatedApprovers.filter(
          (a) => a.status === ProjectTaskProposalStatus.APPROVED,
        ).length;
        const allApproved = totalApprovers > 0 && approvedCount === totalApprovers;
        const anyRejected = updatedApprovers.some(
          (a) => a.status === ProjectTaskProposalStatus.REJECTED,
        );
        const progress =
          totalApprovers > 0 ? Math.round((approvedCount / totalApprovers) * 100) : 0;

        if (anyRejected) {
          await manager.update(
            ProjectTaskProposal,
            { id },
            {
              status: ProjectTaskProposalStatus.REJECTED,
              reasonReject,
              updatedById: user.id,
            },
          );
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Đề xuất bị từ chối',
              content: `${user.name} đã từ chối đề xuất`,
              type: NotificationType.PROPOSAL,
              path: `/dashboard/proposals-project-task?proposalId=${id}`,
              createdById: user.id,
              userIds: notifyUserIds,
            },
            isPushFCM: true,
            manager,
          });
          return;
        }

        await manager.update(ProjectTaskProposal, { id }, { progress });

        let notificationPromise: Promise<any> | null = null;
        if (status === ProjectTaskProposalStatus.APPROVED) {
          notificationPromise = this.notificationService.createManyNotification({
            notification: {
              title: allApproved
                ? 'Đề xuất được phê duyệt hoàn toàn'
                : 'Đề xuất được phê duyệt từng phần',
              content: allApproved
                ? `${user.name} đã phê duyệt đề xuất - Tất cả người phê duyệt đã chấp nhận`
                : `${user.name} đã phê duyệt đề xuất (${approvedCount}/${totalApprovers})`,
              type: NotificationType.PROPOSAL,
              path: `/dashboard/proposals-project-task?proposalId=${id}`,
              createdById: user.id,
              userIds: notifyUserIds,
            },
            isPushFCM: true,
            manager,
          });
        }

        if (!allApproved) {
          if (notificationPromise) await notificationPromise;
          return;
        }

        needPostApprove = true;
        postApproveProjectTaskProposal = proposal;
        if (notificationPromise) await notificationPromise;
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
    if (needPostApprove && postApproveProjectTaskProposal)
      await this.handleProjectTaskProposalApproved(
        postApproveProjectTaskProposal,
        user,
        this.dataSource.manager,
      );

    return { success: true };
  }

  async buildProjectTaskProposalFilter(dto: GetListProjectTaskProposalDto, user: UserRequest) {
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const { type, status, searchType } = dto;
    const baseFilter = {
      ...(type && { type }),
      ...(status && { status }),
    };
    const filter: FindOptionsWhere<ProjectTaskProposal>[] = [];

    const extractIds = (rows: any[]) => rows.map((r) => r.projectTaskId).filter(Boolean);

    if (searchType === ProjectTaskProposalFilterType.MY_PROPOSAL) {
      filter.push({ ...baseFilter, createdById: user.id });
    } else if (searchType === ProjectTaskProposalFilterType.NEED_APPROVE) {
      const proposalApproverRows = await this.projectTaskProposalApproverRepo.find({
        where: { approver: { id: user.id } },
        select: { proposalId: true },
      });
      const proposalApproverIds = extractIds(proposalApproverRows);
      if (proposalApproverIds.length) filter.push({ ...baseFilter, id: In(proposalApproverIds) });
    } else if (isAdmin) {
      filter.push(baseFilter);
    } else {
      const [proposalApproverRows, proposalFollowerRows] = await Promise.all([
        this.projectTaskProposalApproverRepo.find({
          where: { approver: { id: user.id } },
          select: { proposalId: true },
        }),
        this.projectTaskProposalFollowerRepo.find({
          where: { follower: { id: user.id } },
          select: { proposalId: true },
        }),
      ]);
      const proposalApproverIds = extractIds(proposalApproverRows);
      const followerIds = extractIds(proposalFollowerRows);

      filter.push({ ...baseFilter, createdById: user.id });
      if (proposalApproverIds.length) {
        filter.push({ ...baseFilter, id: In(proposalApproverIds) });
      }
      if (followerIds.length) filter.push({ ...baseFilter, id: In(followerIds) });
    }
    return filter;
  }

  async getListProjectTaskProposalOverview(user: UserRequest, dto: GetListProjectTaskProposalDto) {
    const { page, take, orderBy, order, search } = dto;

    let filter = await this.buildProjectTaskProposalFilter(dto, user);
    if (!filter.length) return { total: 0, list: [] };

    let where: FindOptionsWhere<ProjectTaskProposal>[] = filter;
    if (search) {
      const searchWheres: FindOptionsWhere<ProjectTaskProposal>[] = [];
      for (const whereItem of filter) {
        const arr = this.queryService.search({
          arrayPropertyLike: ['title', 'code'],
          search,
          whereItem,
        });
        searchWheres.push(...arr);
      }
      where = searchWheres;
    }
    const [list, total] = await this.projectTaskProposalRepo.findAndCount({
      relations: ['createdBy'],
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          id: true,
          name: true,
          url: true,
        },
      },
    });
    return { total, list };
  }

  async getListProjectTaskProposal(dto: GetListProjectTaskProposalDto, user: UserRequest) {
    const { page, take, orderBy, order, search } = dto;

    let filter = await this.buildProjectTaskProposalFilter(dto, user);
    if (!filter.length) return { total: 0, list: [] };

    let where: FindOptionsWhere<ProjectTaskProposal>[] = filter;
    if (search) {
      const searchWheres: FindOptionsWhere<ProjectTaskProposal>[] = [];
      for (const whereItem of filter) {
        const arr = this.queryService.search({
          arrayPropertyLike: ['title', 'code'],
          search,
          whereItem,
        });
        searchWheres.push(...arr);
      }
      where = searchWheres;
    }
    const [list, total] = await this.projectTaskProposalRepo.findAndCount({
      relations: ['projectTask', 'projectTaskApprovers', 'projectTaskApprovers.approver'],
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        reason: true,
        amount: true,
        progress: true,
        progressAtRequest: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        projectTask: {
          id: true,
          name: true,
          endDate: true,
          estimateDate: true,
          type: true,
        },
        projectTaskApprovers: {
          id: true,
          status: true,
          reasonReject: true,
          approvedAt: true,
          approver: {
            id: true,
            name: true,
            email: true,
            url: true,
          },
        },
      },
    });
    return { total, list };
  }

  async getProjectTaskProposal(id: string, user: UserRequest) {
    const [proposal, proposalApprovers, proposalFollowers] = await Promise.all([
      this.projectTaskProposalRepo.findOne({
        where: { id },
        relations: ['projectTask', 'createdBy'],
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          reason: true,
          amount: true,
          progress: true,
          progressAtRequest: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          projectTask: {
            id: true,
            name: true,
            endDate: true,
            estimateDate: true,
            type: true,
          },
          createdBy: {
            id: true,
            name: true,
            email: true,
            url: true,
          },
        },
      }),
      this.projectTaskProposalApproverRepo.find({
        where: { proposalId: id },
        relations: ['approver'],
        select: {
          id: true,
          status: true,
          approvedAt: true,
          reasonReject: true,
          approver: {
            id: true,
            name: true,
            email: true,
            url: true,
          },
        },
      }),
      this.projectTaskProposalFollowerRepo.find({
        where: { proposalId: id },
        relations: ['follower'],
        select: {
          follower: {
            id: true,
            name: true,
            email: true,
            url: true,
          },
        },
      }),
    ]);

    this.projectTaskHandle.errorNotFoundEntityWithId(proposal, ProjectTaskProposal.name, id);

    const approverIds =
      proposalApprovers.length > 0 ? proposalApprovers.map((a) => a.approver.id) : [];
    const userIdsSet = new Set<string>();
    for (const id of approverIds) if (id) userIdsSet.add(id);
    if (proposal.createdById) userIdsSet.add(proposal.createdById);
    const userIds = Array.from(userIdsSet);

    let userOrgUnitPositionsData: any[] = [];
    if (userIds.length > 0) {
      userOrgUnitPositionsData = await this.userOrgUnitPositionRepo.find({
        where: { userId: In(userIds) },
        relations: ['orgUnit', 'position'],
        select: {
          id: true,
          userId: true,
          orgUnit: {
            id: true,
            name: true,
            type: true,
          },
          position: {
            id: true,
            name: true,
            level: true,
          },
        },
      });
    }

    const userOrgUnitPositionsMap = new Map<string, any[]>();
    for (const uop of userOrgUnitPositionsData) {
      let arr = userOrgUnitPositionsMap.get(uop.userId);
      if (!arr) {
        arr = [];
        userOrgUnitPositionsMap.set(uop.userId, arr);
      }
      arr.push(uop);
    }

    const mappedApprovers =
      proposalApprovers.length > 0
        ? proposalApprovers.map((approver) => ({
            ...approver,
            userOrgUnitPositions: userOrgUnitPositionsMap.get(approver.approver.id) || [],
          }))
        : [];

    let isApprover = false;
    let myAction: string | null = null;
    if (proposalApprovers.length > 0) {
      let anyRejected = false;
      let myApprover: (typeof proposalApprovers)[0] | undefined;
      for (const a of proposalApprovers) {
        if (a.status === ProjectTaskProposalStatus.REJECTED) anyRejected = true;
        if (!myApprover && a?.approver?.id === user.id) myApprover = a;
      }
      isApprover =
        anyRejected ||
        !myApprover ||
        (myApprover && myApprover.status !== ProjectTaskProposalStatus.PENDING);
      if (myApprover) myAction = myApprover.status;
    }

    return {
      ...proposal,
      userOrgUnitPositionsCreated: userOrgUnitPositionsMap.get(proposal.createdById) || [],
      projectTaskApprovers: mappedApprovers,
      projectTaskFollowers: proposalFollowers,
      isApprover,
      myAction,
    };
  }

  async deleteProjectTaskProposal(id: string, user: UserRequest) {
    const proposal = await this.projectTaskProposalRepo.findOne({
      where: { id },
      relations: ['projectTaskApprovers'],
      select: {
        id: true,
        createdById: true,
        projectTaskApprovers: {
          id: true,
          status: true,
        },
      },
    });

    this.projectTaskHandle.errorNotFoundEntityWithId(proposal, ProjectTaskProposal.name, id);

    if (![UserType.ADMIN, UserType.ROOT].includes(user.type) && proposal.createdById !== user.id)
      throw new BadRequestException('Bạn không có quyền xóa đề xuất này');

    if (proposal.projectTaskApprovers.some((a) => a.status === ProjectTaskProposalStatus.APPROVED))
      throw new BadRequestException('Không thể xóa đề xuất vì đã có người phê duyệt');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(ProjectTaskProposal, { id });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async updateProjectTaskProposalFollower(id: string, dto: AttachFollowerDto, user: UserRequest) {
    const proposal = await this.projectTaskProposalRepo.findOne({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!proposal) throw new BadRequestException(`Không tìm thấy đề xuất với id ${id}`);

    const proposalFollowers = await this.projectTaskProposalFollowerRepo.find({
      where: { proposalId: id },
      select: { id: true, followerId: true },
    });
    const existingFollowerIds = proposalFollowers.map((pf) => pf.followerId);
    const newFollowerIds = Array.from(new Set(dto.followerIds?.filter((fid) => !!fid) || []));

    const toAdd = newFollowerIds.filter((fid) => !existingFollowerIds.includes(fid));
    const toRemove = proposalFollowers.filter((pf) => !newFollowerIds.includes(pf.followerId));

    return await this.dataSource
      .transaction(async (manager) => {
        if (toAdd.length === 0 && toRemove.length === 0) return { success: true };

        if (toRemove.length > 0) {
          const removeIds = toRemove.map((pf) => pf.id);
          await manager.delete(ProjectTaskProposalFollower, removeIds);
        }

        if (toAdd.length > 0) {
          const newFollowers = toAdd.map((fid) => ({ proposal: { id }, follower: { id: fid } }));
          await manager.insert(ProjectTaskProposalFollower, newFollowers);

          await this.notificationService.createManyNotification({
            notification: {
              title: 'Theo dõi đề xuất',
              content: `${user.name} đã thêm bạn vào danh sách theo dõi đề xuất`,
              type: NotificationType.PROPOSAL,
              path: `/dashboard/proposals-project-task?proposalId=${id}`,
              createdById: user.id,
              userIds: toAdd,
            },
            isPushFCM: true,
            manager,
          });
        }
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListUserOfProposal(id: string, user: UserRequest) {
    const proposal = await this.projectTaskProposalRepo.findOne({
      where: { id },
      select: {
        projectTaskApprovers: true,
        projectTaskFollowers: true,
        projectTaskId: true,
      },
    });

    if (!proposal) return [];

    const approverIds = Array.isArray(proposal.projectTaskApprovers)
      ? proposal.projectTaskApprovers.map((a) => a.id)
      : [];
    const followerIds = Array.isArray(proposal.projectTaskFollowers)
      ? proposal.projectTaskFollowers.map((f) => f.id)
      : [];

    const [approvers, followers] = await Promise.all([
      approverIds.length > 0
        ? this.projectTaskProposalApproverRepo.find({
            where: { id: In(approverIds) },
            relations: ['approver'],
            select: {
              approver: {
                id: true,
                name: true,
                url: true,
              },
            },
          })
        : [],
      followerIds.length > 0
        ? this.projectTaskProposalFollowerRepo.find({
            where: { id: In(followerIds) },
            relations: ['follower'],
            select: {
              follower: {
                id: true,
                name: true,
                url: true,
              },
            },
          })
        : [],
    ]);

    let usersOfProjectTask = [];
    if (proposal.projectTaskId) {
      usersOfProjectTask = await this.projectTaskService.getListUserOfProjectTask(
        proposal.projectTaskId,
        user,
      );
    }

    const approverUsers = approvers.map((a) => a.approver).filter(Boolean);
    const followerUsers = followers.map((f) => f.follower).filter(Boolean);
    const allUsers = [...approverUsers, ...followerUsers, ...usersOfProjectTask];
    const uniqueUsersMap = new Map();
    for (const user of allUsers) if (user && user.id) uniqueUsersMap.set(user.id, user);

    return Array.from(uniqueUsersMap.values());
  }
}
