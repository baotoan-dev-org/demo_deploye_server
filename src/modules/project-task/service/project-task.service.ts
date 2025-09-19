import * as _ from 'lodash';
import {
  TreeRepository,
  DataSource,
  DeepPartial,
  In,
  FindOptionsWhere,
  Not,
  Repository,
  IsNull,
  EntityManager,
} from 'typeorm';
import {
  ProjectTaskGetInfoOption,
  ProjectTaskProposalStatus,
  ProjectTaskProposalType,
  ProjectTaskViewType,
} from '../project-task.enum';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProjectTaskDto } from '../dtos/create-project-task.dto';
import { ProjectTaskHandle } from '../project-task.handle';
import { GetListProjectTaskDto } from '../dtos/get-list-project-task.dto';
import { QueryService } from '@/common/services/query.service';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectTaskAssignee } from '../entities/project-task-assignee.entity';
import { UpdateProjectTaskDto } from '../dtos/update-project-task.dto';
import { ProjectTaskAssigneeService } from './project-task-assignee.service';
import {
  ProjectTaskAssigneeType,
  ProjectTaskHistoryAction,
  ProjectTaskStatus,
  ProjectTaskType,
  ProjectTaskDelayReason,
  ProjectTaskProgressWarningStatus,
  ProjectTaskBudgetStatus,
  ProjectTaskUpdateAssigneeType,
  ProjectTaskDisplayStatus,
} from '../project-task.enum';
import { OrderType } from '@/common/enums/order-type.enum';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { UpdateProjectTaskProgressDto } from '../dtos/update-project-task-progress.dto';
import { ProjectTaskReport } from '../entities/project-task-report.entity';
import { ProjectTaskDependencyService } from './project-task-dependency.service';
import { GetListProjectTaskChildrenDto } from '../dtos/get-list-project-task-children.dto';
import { ProjectTaskHistoryService } from './project-task-history.service';
import { ProjectTaskHistory } from '../entities/project-task-history.entity';
import { User } from '@/modules/user/entities/user.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationType } from '@/modules/notification/notification.enum';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { ERROR_MESSAGES, PROGRESS_COMPLETE } from '../project-task.constant';
import { GetListProjectTaskDelayReasonDto } from '../dtos/get-list-project-task-delay-reason.dto';
import { ProjectTaskAssigneeHistory } from '../interfaces/project-task.interface';
import { ProjectTaskDependency } from '../entities/project-task-dependency.entity';
import { UserType } from '@/modules/user/user.enum';
import { UpdateProjectTaskDelayReasonDto } from '../dtos/update-project-task-delay-reason.dto';
import { GetListProjectTaskTodoDto } from '../dtos/get-list-project-task-todo.dto';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { GetListProjectTaskAssigneeDto } from '../dtos/get-list-project-task-assignee.dto';
import { ProjectTaskProposal } from '../entities/project-task-proposal.entity';
import { GetListProjectTaskGrantChartDto } from '../dtos/get-list-project-task-grant-chart.dto';
import { GetListProjectTasksByDivisionDto } from '../dtos/get-list-project-task-by-division.dto';

@Injectable()
export class ProjectTaskService {
  constructor(
    @InjectRepository(ProjectTask)
    private readonly projectTaskRepo: TreeRepository<ProjectTask>,

    @InjectRepository(ProjectTaskAssignee)
    private readonly projectTaskAssigneeRepo: TreeRepository<ProjectTaskAssignee>,

    @InjectRepository(ProjectTaskProposal)
    private readonly proposalRepo: Repository<ProjectTaskProposal>,

    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: TreeRepository<OrgUnit>,

    @InjectRepository(ProjectTaskDependency)
    private readonly projectTaskDependencyRepo: Repository<ProjectTaskDependency>,

    @InjectRepository(UserOrgUnitPosition)
    private readonly userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

    private readonly dataSource: DataSource,

    private readonly queryService: QueryService,

    private readonly projectTaskHandle: ProjectTaskHandle,

    private readonly projectTaskAssigneeService: ProjectTaskAssigneeService,

    private readonly projectTaskDependencyService: ProjectTaskDependencyService,

    private readonly projectTaskHistoryService: ProjectTaskHistoryService,

    private readonly notificationService: NotificationService,
  ) {}

  async fixData(): Promise<void> {
    const roots = await this.projectTaskRepo.find({
      where: { parentId: null },
      relations: ['children'],
      select: {
        id: true,
        currencyBudget: true,
        type: true,
        remainingBudget: true,
        children: { id: true, currencyBudget: true, type: true, remainingBudget: true },
      },
    });
    const calcRemainingBudget = async (node: ProjectTask): Promise<number> => {
      if (!Array.isArray(node.children) || node.children.length === 0) {
        node.remainingBudget = node.currencyBudget ?? 0;
        return node.remainingBudget;
      }
      let totalChildBudget = 0;
      for (const child of node.children) {
        totalChildBudget += await calcRemainingBudget(child);
      }
      node.remainingBudget = (node.currencyBudget ?? 0) - totalChildBudget;
      if (node.currencyBudget == null) node.remainingBudget = 0;
      return node.remainingBudget;
    };
    for (const root of roots) {
      await calcRemainingBudget(root);
      await this.projectTaskRepo.save(root);
    }
  }

  async buildAncestorMapOptimized(projectTasks: ProjectTask[]) {
    const ancestorMap = new Map();
    const queue: string[] = [];
    for (const task of projectTasks) {
      if (task.parentId && !ancestorMap.has(task.parentId)) queue.push(task.parentId);
    }
    const batchSize = 1000;
    while (queue.length) {
      const batch = queue.splice(0, batchSize);
      const ancestors = await this.projectTaskRepo.find({
        where: { id: In(batch) },
        select: { id: true, name: true, parentId: true, type: true },
      });
      for (const ancestor of ancestors) {
        if (!ancestorMap.has(ancestor.id)) {
          ancestorMap.set(ancestor.id, ancestor);
          if (ancestor.parentId && !ancestorMap.has(ancestor.parentId)) {
            queue.push(ancestor.parentId);
          }
        }
      }
    }
    return ancestorMap;
  }

  async getListAssignedProjectTasks(
    getListProjectTaskAssigneeDto: GetListProjectTaskAssigneeDto,
    user: UserRequest,
  ) {
    const today = new Date();
    const { search, displayStatus } = getListProjectTaskAssigneeDto;

    const assignees = await this.projectTaskAssigneeRepo.find({
      where: { userId: user.id, unassignedAt: IsNull() },
      relations: ['user'],
      select: {
        projectTaskId: true,
        user: { id: true, name: true, email: true },
      },
    });
    if (!assignees.length) return [];

    const assigneesMap = assignees.reduce((map, a) => {
      if (!map.has(a.projectTaskId)) map.set(a.projectTaskId, []);
      map.get(a.projectTaskId).push(a.user);
      return map;
    }, new Map<string, any[]>());

    let where: FindOptionsWhere<ProjectTask>[] = [
      {
        id: In(assignees.map((a) => a.projectTaskId)),
        type: ProjectTaskType.TASK,
        childrenCount: 0,
      },
    ];
    if (search?.trim()) {
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'code'],
        search: search.trim(),
        whereItem: where[0],
      });
    }

    const projectTasks = await this.projectTaskRepo.find({
      where,
      relations: ['createdBy'],
      select: {
        id: true,
        name: true,
        parentId: true,
        type: true,
        startDate: true,
        endDate: true,
        estimateDate: true,
        progressPercent: true,
        childrenCount: true,
        completedAt: true,
        createdBy: { id: true, name: true, url: true },
      },
      order: { createdAt: OrderType.DESC },
    });
    if (!projectTasks.length) return [];

    const ancestorMap = await this.buildAncestorMapOptimized(projectTasks);

    const getAncestorProjectNames = (parentId: string | null) => {
      const names: { id: string; name: string }[] = [];
      let pid = parentId;
      while (pid && ancestorMap.has(pid)) {
        const node = ancestorMap.get(pid);
        if (node.type === ProjectTaskType.PROJECT) names.push({ id: node.id, name: node.name });
        pid = node.parentId;
      }
      return names;
    };

    const statusArr = displayStatus
      ? Array.isArray(displayStatus)
        ? displayStatus
        : [displayStatus]
      : null;

    const enrichedTasks = projectTasks
      .map((projectTask) => {
        const calculatedDisplayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(
          projectTask,
          today,
        ) as ProjectTaskDisplayStatus;
        if (statusArr && !statusArr.includes(calculatedDisplayStatus)) return null;
        const projectNames = getAncestorProjectNames(projectTask.parentId);
        return {
          ...projectTask,
          displayStatus: calculatedDisplayStatus,
          parentProjectName: projectNames[0]?.name ?? '',
          grandParentProjectName: projectNames[1]?.name ?? projectNames[0]?.name ?? '',
          users: assigneesMap.get(projectTask.id) || [],
        };
      })
      .filter(Boolean);

    const groupedByStatus = enrichedTasks.reduce((acc, task) => {
      if (!acc.has(task.displayStatus)) acc.set(task.displayStatus, []);
      acc.get(task.displayStatus).push(task);
      return acc;
    }, new Map());

    return Array.from(groupedByStatus.entries()).map(([status, projectTasks]) => ({
      displayStatus: status,
      count: projectTasks.length,
      projectTasks,
    }));
  }

  async getListProjectTaskToDo(
    getListProjectTaskTodoDto: GetListProjectTaskTodoDto,
    user: UserRequest,
  ) {
    const today = new Date();
    const { search, displayStatus } = getListProjectTaskTodoDto;

    // 1. Build where conditions for TODO tasks
    let whereItem: FindOptionsWhere<ProjectTask> = {
      type: ProjectTaskType.TODO,
      createdById: user.id,
    };

    let where: FindOptionsWhere<ProjectTask>[] = [whereItem];

    if (search?.trim()) {
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'code'],
        search: search.trim(),
        whereItem,
      });
    }

    // 2. Fetch TODO tasks
    const tasks = await this.projectTaskRepo.find({
      where,
      order: { createdAt: OrderType.DESC },
      select: {
        id: true,
        name: true,
        parentId: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        estimateDate: true,
        progressPercent: true,
        childrenCount: true,
        completedAt: true,
      },
    });

    if (!tasks.length) return [];

    // 3. Build complete task hierarchy if tasks have parents
    const allTasks = await this.buildCompleteTaskHierarchy(tasks);

    // 4. Build tree structure with early status calculation and filtering
    type TodoNode = {
      children: TodoNode[];
      displayStatus: string;
    } & (typeof tasks)[0];

    const idToTask = new Map<string, TodoNode>();
    const statusFilterArr = displayStatus
      ? Array.isArray(displayStatus)
        ? displayStatus
        : [displayStatus]
      : null;

    // Create nodes with immediate status calculation
    const enriched: TodoNode[] = allTasks
      .map((task) => {
        const calculatedStatus = this.projectTaskHandle.calculateTaskDisplayStatus(
          task,
          today,
        ) as ProjectTaskDisplayStatus;

        // Early filtering by status to avoid unnecessary processing
        if (statusFilterArr && !statusFilterArr.includes(calculatedStatus)) return null;

        const node: TodoNode = {
          ...task,
          children: [],
          displayStatus: calculatedStatus,
        };
        idToTask.set(task.id, node);
        return node;
      })
      .filter(Boolean); // Remove null entries from early filtering

    // Build parent-child relationships only for remaining nodes
    const validNodeIds = new Set(enriched.map((node) => node.id));
    for (const node of enriched) {
      if (node.parentId && idToTask.has(node.parentId) && validNodeIds.has(node.parentId)) {
        idToTask.get(node.parentId)!.children.push(node);
      }
    }

    // 5. Get root nodes only
    const todoTree: TodoNode[] = enriched.filter((node) => !node.parentId);

    // 6. Apply tree filtering if status filter exists (for hierarchical filtering)
    const finalTree = statusFilterArr
      ? this.filterTreeByStatus(todoTree, statusFilterArr)
      : todoTree;

    // 7. Group by displayStatus with optimized grouping
    const groupedByStatus = finalTree.reduce(
      (acc, node) => {
        const status = node.displayStatus;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(node);
        return acc;
      },
      {} as Record<string, TodoNode[]>,
    );

    // 8. Return optimized result
    return Object.entries(groupedByStatus).map(([status, tasks]) => ({
      displayStatus: status,
      count: (tasks as TodoNode[]).length,
      projectTasks: tasks as TodoNode[],
    }));
  }

  async createProjectTask(createProjectTaskDto: CreateProjectTaskDto, user: UserRequest) {
    let {
      parentId,
      orgUnitIds = [],
      dependsOnTaskIds = [],
      userIds = [],
      title,
      reason,
      approverIds = [],
      followerIds = [],
      ...dto
    } = createProjectTaskDto;
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    this.projectTaskHandle.errorStartDateAfterEndDate(dto.startDate, dto.endDate, dto.estimateDate);
    const [allDescendantIds, parent, parentAssignees, code] = await Promise.all([
      this.projectTaskHandle.getAllDescendantIdsByUserId(isAdmin, user.id, user.orgUnitId),
      parentId
        ? this.projectTaskRepo.findOne({
            relations: ['children'],
            where: { id: parentId },
            select: {
              id: true,
              startDate: true,
              endDate: true,
              estimateDate: true,
              type: true,
              isBudgetConfirmed: true,
              remainingBudget: true,
              budget: true,
              children: { id: true, budget: true, type: true, weight: true },
              childrenCount: true,
            },
          })
        : null,
      parentId
        ? this.projectTaskAssigneeRepo.find({
            relations: ['orgUnit'],
            where: { projectTask: { id: parentId }, unassignedAt: IsNull() },
            select: {
              id: true,
              orgUnit: { id: true, type: true },
            },
          })
        : [],
      this.projectTaskHandle.generateCode(dto.type, parentId, this.projectTaskRepo.manager),
    ]);
    await this.validateAndCheckDependency(dependsOnTaskIds, dto.startDate);
    await this.validateParentAndAssignee(parent, dto, parentId, parentAssignees, orgUnitIds);
    this.projectTaskHandle.errorCheckPermission(isAdmin, parentId, allDescendantIds);
    const allApproversAreCreator =
      approverIds && approverIds.length > 0 && approverIds.every((id) => id === user.id);

    const id = uuidv4();
    const { isBudgetConfirmed, budgetStatus } =
      this.projectTaskHandle.getBudgetConfirmationAndStatus({
        parentId,
        budget: dto.budget,
        approverIds,
        allApproversAreCreator,
      });

    const projectInsert: DeepPartial<ProjectTask> = {
      ...dto,
      id,
      code,
      isBudgetConfirmed,
      remainingWeight: 100,
      remainingBudget: dto.currencyBudget || 0,
      ...(parentId && { parent: { id: parentId } }),
      ...(!parentId && { weight: 100 }),
      ...(budgetStatus && { budgetStatus: budgetStatus as ProjectTaskBudgetStatus }),
      createdById: user.id,
      status:
        dto.type === ProjectTaskType.TODO
          ? ProjectTaskStatus.IN_PROGRESS
          : ProjectTaskStatus.ACTIVE,
      ...(dto.followers && { followers: dto.followers.map((id: string) => ({ id })) }),
    };

    return await this.dataSource
      .transaction(async (manager) => {
        const projectTask = await manager.save(ProjectTask, projectInsert);

        if (parentId && dto.currencyBudget) {
          const remainingBudget = Math.max(
            0,
            Number(parent.remainingBudget || 0) - Number(dto.currencyBudget),
          );
          await manager.save(ProjectTask, { id: parent.id, remainingBudget });
        }

        // Update dependency
        if (dependsOnTaskIds?.length > 0)
          await this.projectTaskDependencyService.updateProjectTaskDependency(
            projectTask.id,
            dependsOnTaskIds,
            manager,
          );

        // Save history
        await manager.save(ProjectTaskHistory, {
          type: dto.type,
          action: ProjectTaskHistoryAction.CREATE,
          projectTaskId: projectTask.id,
          oldValue: {},
          newValue: projectInsert,
          changedFields: Object.keys(projectInsert),
          createdById: user.id,
        });

        // Create assignees
        await this.projectTaskAssigneeService.createProjectTaskAssignee(
          {
            orgUnitIds,
            userIds,
            projectTaskId: projectTask.id,
            type: dto.type,
          },
          {
            createdByUser: { id: user.id, name: user.name },
            projectTaskName: projectTask.name,
            notificationService: this.notificationService,
            manager,
          },
        );

        await this.updateParentProgressAndWeight(parentId, parent, manager, user, dto.weight);

        if (!parentId && dto.type === ProjectTaskType.PROJECT && dto.budget) {
          if (approverIds.length > 0) {
            await this.projectTaskHandle.createBudgetProjectTaskProposalAndNotify({
              manager,
              proposalParams: {
                title,
                reason,
                amount: dto.amount || 0,
                currency: dto.currency,
                exchangeRate: dto.exchangeRate,
                currencyBudget: dto.currencyBudget,
                projectTaskId: projectTask.id,
                status: allApproversAreCreator
                  ? ProjectTaskProposalStatus.APPROVED
                  : ProjectTaskProposalStatus.PENDING,
                createdById: user.id,
                type: ProjectTaskProposalType.BUDGET_APPROVAL,
              },
              approverIds,
              followerIds,
              user,
              proposalPath: `/dashboard/proposals-project-task?proposalId=`,
            });
          }

          if (dto.followers && dto.followers.length > 0) {
            await this.notificationService.createManyNotification({
              notification: {
                title: 'Theo dõi công việc',
                content: `${user.name} đã thêm bạn theo dõi công việc "${projectTask.name}"`,
                type: NotificationType.PROJECT_TASK,
                path: `/dashboard/proposals-project-task?projectTaskId=${projectTask.id}`,
                createdById: user.id,
                userIds: dto.followers,
              },
              isPushFCM: true,
              manager,
            });
          }
        }

        return projectTask;
      })
      .then((projectTask) => ({
        success: true,
        parentId: projectTask?.id || null,
        isBudgetConfirmed: projectInsert.isBudgetConfirmed,
        isHaveBudget: projectInsert.budget ? true : false,
      }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async updateProjectTask(
    id: string,
    updateProjectTaskDto: UpdateProjectTaskDto,
    user: UserRequest,
  ) {
    let {
      parentId,
      orgUnitIds,
      userIds,
      dependsOnTaskIds,
      title,
      reason,
      approverIds,
      followerIds,
      followers,
      ...dto
    } = updateProjectTaskDto;
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const normalizedDto = this.projectTaskHandle.normalizeDataForComparison(dto);
    const { startDate, endDate, estimateDate } = normalizedDto;
    this.projectTaskHandle.errorStartDateAfterEndDate(startDate, endDate, estimateDate);

    const [allDescendantIds, parentProjectTask, projectTask, oldAssigneeRaw, parentAssigneeRaw] =
      await Promise.all([
        this.projectTaskHandle.getAllDescendantIdsByUserId(isAdmin, user.id, user?.orgUnitId),
        parentId
          ? this.projectTaskRepo.findOne({
              relations: { children: true },
              where: { id: parentId },
              select: {
                id: true,
                startDate: true,
                endDate: true,
                type: true,
                estimateDate: true,
                isBudgetConfirmed: true,
                remainingBudget: true,
                budget: true,
                childrenCount: true,
                children: { id: true, budget: true, type: true, weight: true },
              },
            })
          : null,
        this.projectTaskRepo.findOne({
          where: { id },
          select: {
            id: true,
            name: true,
            type: true,
            startDate: true,
            endDate: true,
            estimateDate: true,
            budget: true,
            parentId: true,
            code: true,
            description: true,
            isBudgetConfirmed: true,
            progressPercent: true,
            createdById: true,
            updatedById: true,
            attachments: true,
            status: true,
            weight: true,
          },
        }),
        this.projectTaskAssigneeRepo.find({
          where: { projectTaskId: id, unassignedAt: IsNull() },
          relations: { user: true, orgUnit: true },
          select: {
            id: true,
            userId: true,
            orgUnitId: true,
            type: true,
            user: { id: true, name: true, url: true },
            orgUnit: { id: true, name: true },
          },
        }),
        parentId
          ? this.projectTaskAssigneeRepo.find({
              where: { projectTaskId: parentId, unassignedAt: IsNull() },
              relations: { orgUnit: true },
              select: { id: true, userId: true, type: true, orgUnit: { id: true, name: true } },
            })
          : [],
      ]);
    this.projectTaskHandle.errorNotFoundEntityWithId(projectTask, 'Dự án', id);
    await this.validateAndCheckDependency(dependsOnTaskIds, startDate);
    this.projectTaskHandle.errorCheckPermission(isAdmin, parentId, allDescendantIds);
    await this.validateParentAndAssignee(
      parentProjectTask,
      { ...normalizedDto, weight: dto.weight },
      parentId,
      parentAssigneeRaw,
      orgUnitIds,
      projectTask,
    );

    const allApproversAreCreator =
      approverIds?.length > 0 && approverIds.every((id) => id === user.id);

    const formatAssignees = (assignees: ProjectTaskAssignee[]) =>
      assignees.map((a) => ({
        userId: a.userId,
        name: a.user?.name || null,
        orgUnitId: a.orgUnitId,
        orgUnitName: a.orgUnit?.name || null,
        url: a.user?.url || null,
        type: a.type,
      }));
    const oldAssignees = formatAssignees(oldAssigneeRaw);
    const projectUpdate: DeepPartial<ProjectTask> = {
      ...normalizedDto,
      ...(parentId && { parent: { id: parentId } }),
      updatedById: user.id,
    };

    let descendantIds: string[] = [];
    if (projectTask.status !== normalizedDto.status) {
      const descendants = await this.projectTaskRepo.findDescendants(projectTask);
      descendantIds = descendants.filter((t) => t.id !== id).map((t) => t.id);
    }

    const { isBudgetConfirmed, budgetStatus } =
      this.projectTaskHandle.getBudgetConfirmationAndStatus({
        parentId,
        budget: normalizedDto.budget,
        approverIds,
        allApproversAreCreator,
        oldBudget: projectTask.budget,
        oldIsBudgetConfirmed: projectTask.isBudgetConfirmed,
      });

    return await this.dataSource
      .transaction(async (manager) => {
        const updateProjectTask = {
          id,
          ...projectUpdate,
          isBudgetConfirmed,
          ...(budgetStatus && { budgetStatus: budgetStatus as ProjectTaskBudgetStatus }),
          ...(followers && { followers: followers.map((f: string) => ({ id: f })) }),
        };
        const updatedProjectTask = await manager.save(ProjectTask, updateProjectTask);

        if (parentId && dto.currencyBudget) {
          const prevParentBudget = Number(parentProjectTask.remainingBudget || 0);
          const prevTaskBudget = Number(projectTask.currencyBudget || 0);
          const newTaskBudget = Number(dto.currencyBudget);
          const remainingBudget = Math.max(0, prevParentBudget + prevTaskBudget - newTaskBudget);
          await manager.save(ProjectTask, { id: parentProjectTask.id, remainingBudget });
        }

        await this.updateParentProgressAndWeight(
          parentId,
          parentProjectTask,
          manager,
          user,
          dto.weight,
          projectTask.weight,
        );
        if (dependsOnTaskIds?.length)
          await this.projectTaskDependencyService.updateProjectTaskDependency(
            updatedProjectTask.id,
            dependsOnTaskIds,
            manager,
          );
        if (orgUnitIds && userIds)
          await this.projectTaskAssigneeService.updateProjectTaskAssignee(
            {
              orgUnitIds,
              userIds,
              projectTaskId: updatedProjectTask.id,
            },
            ProjectTaskUpdateAssigneeType.ALL,
            manager,
            {
              createdByUser: { id: user.id, name: user.name },
              projectTaskName: updatedProjectTask.name,
              notificationService: this.notificationService,
            },
          );

        if (!parentId && projectTask.type === ProjectTaskType.PROJECT) {
          if (Number(projectTask.budget ?? 0) !== Number(normalizedDto.budget ?? 0)) {
            const oldProposals = await manager.find(ProjectTaskProposal, {
              where: { projectTaskId: id, type: ProjectTaskProposalType.BUDGET_APPROVAL },
              select: { id: true },
            });
            await this.projectTaskHandle.createBudgetProjectTaskProposalAndNotify({
              manager,
              proposalParams: {
                title,
                reason,
                amount: dto.amount || 0,
                currency: dto.currency,
                exchangeRate: dto.exchangeRate,
                currencyBudget: dto.currencyBudget,
                projectTaskId: updatedProjectTask.id,
                status: ProjectTaskProposalStatus.PENDING,
                createdById: user.id,
                progressAtRequest: projectTask ? projectTask.progressPercent : 0,
                type: ProjectTaskProposalType.BUDGET_APPROVAL,
              },
              approverIds,
              followerIds,
              user,
              proposalPath: `/dashboard/project-task?proposalId=`,
              oldProposals,
            });
          }
          if (followerIds && followerIds.length > 0) {
            await this.notificationService.createManyNotification({
              notification: {
                title: 'Cập nhật người theo dõi công việc',
                content: `${user.name} đã cập nhật người theo dõi cho công việc "${projectTask.name}"`,
                type: NotificationType.PROJECT_TASK,
                path: `/dashboard/project-task?projectTaskId=${projectTask.id}`,
                createdById: user.id,
                userIds: followerIds,
              },
              isPushFCM: true,
              manager,
            });
          }
        }
        if (descendantIds.length)
          await manager.update(
            ProjectTask,
            { id: In(descendantIds) },
            { status: normalizedDto.status },
          );

        const newAssigneesRaw = await manager.find(ProjectTaskAssignee, {
          where: { projectTask: { id }, unassignedAt: IsNull() },
          relations: { user: true, orgUnit: true },
          select: {
            id: true,
            userId: true,
            orgUnitId: true,
            type: true,
            user: { id: true, name: true, url: true },
            orgUnit: { id: true, name: true, type: true },
          },
        });

        const newAssignees = formatAssignees(newAssigneesRaw);
        await this.createUpdateHistoryIfNeeded(
          projectTask,
          projectUpdate,
          oldAssignees,
          newAssignees,
          normalizedDto,
          user,
        );
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        console.log('err', err);
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async validateAndCheckDependency(
    dependsOnTaskIds: string[],
    startDate: Date | string,
    projectTaskId?: string,
  ) {
    if (dependsOnTaskIds && dependsOnTaskIds.length > 1)
      throw new BadRequestException(ERROR_MESSAGES.DEPENDS_ON_TASK_INVALID);
    if (dependsOnTaskIds?.length > 0) {
      await this.projectTaskDependencyService.checkDependencyTimeConstraint(
        projectTaskId ?? null,
        dependsOnTaskIds,
        typeof startDate === 'string' ? new Date(startDate) : startDate,
      );
    }
  }

  async validateParentAndAssignee(
    parent: ProjectTask,
    dto,
    parentId: string,
    currentAssignees,
    orgUnitIds: string[],
    projectTask?: ProjectTask,
  ) {
    if (!parentId) return;
    if (projectTask) this.projectTaskHandle.errorCheckValidateParentTimeWithChildren(parent);
    this.projectTaskHandle.errorNotFoundEntityWithId(
      parent,
      parent?.type === ProjectTaskType.PROJECT ? 'Dự án cha' : 'Công việc cha',
      parentId,
    );
    this.projectTaskHandle.errorCheckParentTimeConstraint(
      parent,
      dto.startDate,
      dto.endDate,
      dto.estimateDate,
      dto.type,
    );
    this.projectTaskHandle.errorCheckParentBudgetConstraint(
      parent,
      dto.budget,
      projectTask?.budget ?? 0,
    );
    this.projectTaskHandle.errorCheckWeightConstraint(dto.weight, parent, projectTask?.weight ?? 0);
    await this.projectTaskHandle.errorValidateProjectTaskAssignee(currentAssignees, orgUnitIds);
  }

  async updateParentProgressAndWeight(
    parentId: string,
    parent: ProjectTask,
    manager: EntityManager,
    user: UserRequest,
    weight: number,
    oldWeight?: number,
  ) {
    if (parentId) {
      await this.projectTaskHandle.updateProgressRecursively(parentId, manager, user);
      await this.projectTaskHandle.updateRemainingWeight(
        parent,
        manager,
        weight || 0,
        oldWeight || 0,
      );
    }
  }

  async deleteProjectTask(rootId: string, user: UserRequest) {
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const root = await this.projectTaskRepo.findOne({
      where: { id: rootId },
      select: {
        id: true,
        name: true,
        type: true,
        startDate: true,
        endDate: true,
        estimateDate: true,
        budget: true,
        parentId: true,
        code: true,
        description: true,
        isBudgetConfirmed: true,
        progressPercent: true,
        attachments: true,
        weight: true,
      },
    });
    this.projectTaskHandle.errorNotFoundEntityWithId(root, 'Dự án', rootId);

    const parent = root.parentId
      ? await this.projectTaskRepo.findOne({
          where: { id: root.parentId },
          relations: ['children'],
          select: {
            id: true,
            weight: true,
            remainingWeight: true,
            childrenCount: true,
            type: true,
            budget: true,
            isBudgetConfirmed: true,
          },
        })
      : null;

    const [assignees, allDescendantIds] = await Promise.all([
      this.projectTaskAssigneeRepo.find({
        where: {
          projectTask: { id: rootId },
          unassignedAt: IsNull(),
        },
        relations: {
          user: true,
          orgUnit: true,
        },
        select: {
          id: true,
          userId: true,
          user: { id: true, name: true },
          orgUnit: { id: true, name: true },
        },
      }),
      this.projectTaskHandle.getAllDescendantIdsByUserId(isAdmin, user.id, user?.orgUnitId),
    ]);
    this.projectTaskHandle.errorCheckPermission(isAdmin, root.parentId || null, allDescendantIds);

    const notifyUserIds = assignees.map((a) => a.userId).filter((id) => id && id !== user.id);

    return this.dataSource
      .transaction(async (manager) => {
        if (root.parentId) {
          await this.projectTaskHandle.updateProgressRecursively(root.parentId, manager, user);
          await this.projectTaskHandle.updateRemainingWeight(parent, manager, 0, root.weight || 0);
        }
        this.projectTaskHistoryService.createProjectTaskHistory(
          {
            oldData: root,
            newData: {},
            type: root.type,
            action: ProjectTaskHistoryAction.DELETE,
            projectTaskId: root.id,
          },
          user,
        );
        await this.projectTaskDependencyService.updateProjectTaskDependency(rootId, [], manager);
        await manager.delete(ProjectTask, { id: rootId });
        if (notifyUserIds.length > 0) {
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Công việc đã bị xóa',
              content: `${user.name} đã xóa công việc: ${root.name}`,
              type: NotificationType.PROJECT_TASK,
              path: `/dashboard/project-task?projectTaskId=${root.id}`,
              createdById: user.id,
              userIds: notifyUserIds,
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

  async getListProjectTasksByDivision(
    getListProjectTasksByDivisionDto: GetListProjectTasksByDivisionDto,
    user: UserRequest,
  ) {
    const today = new Date();
    const { search, type } = getListProjectTasksByDivisionDto;

    let whereItemDivision = {};

    // Kiểm tra quyền xem tất cả các đơn vị
    const checkPermissionOrgUnit = await this.projectTaskHandle.getOrgUnitsByUserPermissions(user);

    let whereItem: FindOptionsWhere<ProjectTask> = {};

    // Search
    let whereDivision: FindOptionsWhere<OrgUnit>[] = [whereItemDivision];

    whereItemDivision['type'] = OrgUnitType.DIVISION.toString();

    if (search)
      whereDivision = this.queryService.search({
        arrayPropertyLike: ['name'],
        search,
        whereItem: whereItemDivision,
      });

    whereItem = await this.projectTaskHandle.getAllDescendantIdsByUserIdWithPermission(
      [UserType.ADMIN, UserType.ROOT].includes(user.type),
      user,
      whereItem,
    );

    whereItem.parentId = IsNull();

    const projectTasks = await this.projectTaskRepo.find({
      where: whereItem,
      select: {
        id: true,
        status: true,
        startDate: true,
        estimateDate: true,
        endDate: true,
        budget: true,
        usedBudget: true,
        currencyBudget: true,
        childrenCount: true,
        progressPercent: true,
        completedAt: true,
      },
    });

    const assignees = await this.projectTaskAssigneeRepo.find({
      where: {
        projectTaskId: In(projectTasks.map((t) => t.id)),
        unassignedAt: IsNull(),
        orgUnitId: Not(IsNull()),
      },
      relations: ['orgUnit'],
      select: {
        id: true,
        projectTaskId: true,
        orgUnitId: true,
        unassignedAt: true,
      },
    });

    let orgUnitInfoList = [];
    const allOrgUnitIds = Array.from(new Set(assignees.map((a) => a.orgUnitId)));

    if (checkPermissionOrgUnit) {
      orgUnitInfoList = await this.orgUnitRepo.find({
        where: whereDivision,
        relations: ['manager'],
        select: { id: true, name: true, type: true, manager: { id: true, name: true, url: true } },
      });
    } else {
      orgUnitInfoList = await this.projectTaskHandle.getInfoDivisionAndDepartmentFromOrgUnits(
        allOrgUnitIds,
        ProjectTaskGetInfoOption.DIVISION,
        search,
      );
    }

    const assigneesByTaskId = new Map<string, ProjectTaskAssignee[]>();
    for (const a of assignees) {
      const key = String(a.projectTaskId);
      if (!assigneesByTaskId.has(key)) assigneesByTaskId.set(key, []);
      assigneesByTaskId.get(key)!.push(a);
    }

    // Kết quả cho từng division
    const results = [];
    for (const division of orgUnitInfoList) {
      let notStarted = 0,
        inProgress = 0,
        completed = 0,
        overdue = 0;

      for (const projectTask of projectTasks) {
        const assigneesOfTask = assigneesByTaskId.get(String(projectTask.id)) || [];

        // Kiểm tra xem task này có assignee thuộc division hiện tại không
        const hasAssigneeInDivision = assigneesOfTask.some((assignee) => {
          return (
            assignee.orgUnit &&
            assignee.orgUnit.type === OrgUnitType.DIVISION &&
            assignee.orgUnitId === division.id
          );
        });

        // Nếu task không có assignee thuộc division này thì skip
        if (!hasAssigneeInDivision) continue;

        // Kiểm tra điều kiện filter theo type
        let passTypeFilter = true;
        if (type) {
          const allTaskDivisions = assigneesOfTask
            .filter((a) => a.orgUnit && a.orgUnit.type === OrgUnitType.DIVISION)
            .map((a) => a.orgUnitId);

          const uniqueDivisions = new Set(allTaskDivisions);
          const isDivisionType = type.trim() === ProjectTaskViewType.DIVISION;
          const isCrossDivisionType = type.trim() === ProjectTaskViewType.CROSS_DIVISION;

          if (isDivisionType) passTypeFilter = uniqueDivisions.size === 1;
          else if (isCrossDivisionType) passTypeFilter = uniqueDivisions.size > 1;
        }

        if (passTypeFilter) {
          const displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(
            projectTask,
            today,
          );
          switch (displayStatus) {
            case ProjectTaskDisplayStatus.NOT_STARTED:
              notStarted++;
              break;
            case ProjectTaskDisplayStatus.IN_PROGRESS:
              inProgress++;
              break;
            case ProjectTaskDisplayStatus.COMPLETED:
            case ProjectTaskDisplayStatus.COMPLETED_LATE:
              completed++;
              break;
            case ProjectTaskDisplayStatus.OVERDUE:
              overdue++;
              break;
          }
        }
      }

      const total = notStarted + inProgress + completed + overdue;

      if (!checkPermissionOrgUnit && total === 0) continue;

      results.push({
        division,
        notStarted,
        inProgress,
        completed,
        overdue,
        total,
      });
    }

    return results;
  }

  async getListProjectTaskGrantChart(
    getListProjectTaskGrantChartDto: GetListProjectTaskGrantChartDto,
    user: UserRequest,
  ) {
    const today = new Date();
    const checkPermissionOrgUnit = await this.projectTaskHandle.getOrgUnitsByUserPermissions(user);
    const { search, type, divisionId, displayStatus } = getListProjectTaskGrantChartDto;
    const selectFields = {
      id: true,
      name: true,
      type: true,
      startDate: true,
      endDate: true,
      estimateDate: true,
      progressPercent: true,
      usedBudget: true,
      budget: true,
      parentId: true,
      completedAt: true,
      currencyBudget: true,
      currency: true,
      exchangeRate: true,
    };

    let whereItem: FindOptionsWhere<ProjectTask> = {};
    whereItem = await this.projectTaskHandle.getAllDescendantIdsByUserIdWithPermission(
      [UserType.ADMIN, UserType.ROOT].includes(user.type),
      user,
      whereItem,
    );
    let where: FindOptionsWhere<ProjectTask>[] = [whereItem];
    if (search?.trim())
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'code'],
        search: search.trim(),
        whereItem,
      });

    // 1. Truy vấn tất cả task một lần
    const allTasks = await this.projectTaskRepo.find({
      where,
      select: selectFields,
      order: { createdAt: OrderType.DESC },
    });
    if (!allTasks.length) return [];

    // 2. Truy vấn tất cả assignees một lần
    const assignees = await this.projectTaskAssigneeRepo.find({
      where: {
        projectTaskId: In(allTasks.map((task) => task.id)),
        unassignedAt: IsNull(),
      },
      relations: { orgUnit: true },
      select: {
        id: true,
        projectTaskId: true,
        orgUnitId: true,
        orgUnit: { id: true, name: true, type: true },
        type: true,
      },
    });

    // 3. Gom assignees theo division
    const tasksByDivisionId = new Map<string, Set<string>>();
    for (const a of assignees) {
      if (a.orgUnit && a.orgUnit.type === OrgUnitType.DIVISION) {
        if (!tasksByDivisionId.has(a.orgUnitId)) tasksByDivisionId.set(a.orgUnitId, new Set());
        tasksByDivisionId.get(a.orgUnitId).add(a.projectTaskId);
      }
    }

    // 4. Build tree cho tất cả task một lần
    const taskMap = new Map(allTasks.map((task) => [task.id, task]));
    const treeMap = new Map();
    for (const task of allTasks) {
      treeMap.set(task.id, { ...task, children: [] });
    }
    for (const task of allTasks) {
      if (task.parentId && treeMap.has(task.parentId)) {
        treeMap.get(task.parentId).children.push(treeMap.get(task.id));
      }
    }
    const rootTasks = Array.from(treeMap.values()).filter((t) => t.parentId == null);

    // 5. Tính trạng thái cho từng task
    for (const t of treeMap.values()) {
      const { timeProgressPercent, overdueProgressPercent } =
        this.projectTaskHandle.calculateTimeProjectTask(t, today);
      const progressWarning = this.projectTaskHandle.calculateProgressWarning(
        t.progressPercent || 0,
        t.estimateDate,
        today,
        t.startDate,
      );
      const budgetWarning = this.projectTaskHandle.calculateBudgetWarning(
        t.currencyBudget,
        t.usedBudget,
        t.estimateDate,
        today,
        t.startDate,
      );
      t.displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(t, today);
      t.timeProgressPercent = timeProgressPercent;
      t.overdueProgressPercent = overdueProgressPercent;
      t.progressWarningStatus = progressWarning.warning;
      t.progressWarningGap = progressWarning.progressGap;
      t.minExpectedProgress = progressWarning.minExpectedProgress;
      t.budgetWarningStatus = budgetWarning.warning;
      t.minExpectedBudget = budgetWarning.minExpectedBudget;
    }

    // 6. Lấy danh sách division
    let orgUnitInfoList = [];
    if (checkPermissionOrgUnit) {
      orgUnitInfoList = await this.orgUnitRepo.find({
        where: { type: OrgUnitType.DIVISION.toString() as any },
        select: { id: true, name: true, type: true },
      });
    } else {
      const allOrgUnitIds = Array.from(tasksByDivisionId.keys());
      orgUnitInfoList = allOrgUnitIds.length
        ? await this.projectTaskHandle.getInfoDivisionAndDepartmentFromOrgUnits(
            allOrgUnitIds,
            ProjectTaskGetInfoOption.DIVISION,
          )
        : [];
    }

    // 7. Trả về kết quả cho từng division
    const result = [];
    for (const division of orgUnitInfoList) {
      if (divisionId && division.id !== divisionId) continue;
      const taskIdsForDivision = Array.from(tasksByDivisionId.get(division.id) || []);
      let projectsForDivision = rootTasks.filter((t) => taskIdsForDivision.includes(t.id));
      if (type) {
        projectsForDivision = projectsForDivision.filter((project) => {
          // Lấy tất cả division của project
          const projectDivisions = assignees
            .filter(
              (a) =>
                a.projectTaskId === project.id &&
                a.orgUnit &&
                a.orgUnit.type === OrgUnitType.DIVISION,
            )
            .map((a) => a.orgUnitId);
          const uniqueDivisions = new Set(projectDivisions);
          if (type.trim() === ProjectTaskViewType.DIVISION)
            return uniqueDivisions.size === 1 && uniqueDivisions.has(division.id);
          else if (type.trim() === ProjectTaskViewType.CROSS_DIVISION)
            return uniqueDivisions.size > 1 && uniqueDivisions.has(division.id);
          return true;
        });
      }
      if (displayStatus && displayStatus.length > 0) {
        const statusArr = Array.isArray(displayStatus) ? displayStatus : [displayStatus];
        projectsForDivision = projectsForDivision
          .map((project) => this.filterTreeByStatus(project, statusArr))
          .filter(Boolean);
      }
      result.push({
        id: division.id,
        name: division.name,
        projects: projectsForDivision,
      });
    }
    return result;
  }

  async getListProjectTask(getListProjectTaskDto: GetListProjectTaskDto, user: UserRequest) {
    const today = new Date();
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const { search, displayStatus, projectTaskIds, fromDate, toDate, divisionId, type } =
      getListProjectTaskDto;

    // 1. Build where conditions
    const whereItem = await this.buildWhereConditions({
      divisionId,
      projectTaskIds,
      fromDate,
      toDate,
      isAdmin,
      user,
    });

    if (!whereItem) return [];

    // 2. Fetch base tasks with search
    const tasks = await this.fetchBaseTasks(whereItem, search);
    if (!tasks.length) return [];

    // 3. Build complete task hierarchy
    const allTasks = await this.buildCompleteTaskHierarchy(tasks);

    // 4. Fetch and organize related data in parallel
    const [dependencies, assignees] = await this.fetchRelatedData(allTasks);

    // 5. Build enriched tree structure
    const enrichedTree = await this.buildEnrichedTree({
      allTasks,
      dependencies,
      assignees,
      user,
      isAdmin,
      today,
    });

    // 6. Apply filters and get root projects
    const rootProjects = this.filterAndGetRootProjects(enrichedTree, displayStatus);
    if (!rootProjects.length) return [];

    // 7. Process results with division filtering
    return await this.processResultsWithDivisionFiltering({
      rootProjects,
      assignees,
      type,
    });
  }

  async collectAllDescendantIds(rootTasks: ProjectTask[]): Promise<string[]> {
    if (!rootTasks.length) return [];

    const descendantLists = await Promise.all(
      rootTasks.map((root) => this.projectTaskRepo.findDescendants(root)),
    );

    const idsSet = new Set<string>();
    for (const list of descendantLists) {
      for (const task of list) {
        idsSet.add(task.id);
      }
    }

    return [...idsSet];
  }

  // Helper methods for better organization
  async buildWhereConditions({ divisionId, projectTaskIds, fromDate, toDate, isAdmin, user }) {
    if (!divisionId) {
      let whereItem: FindOptionsWhere<ProjectTask> = {};

      if (projectTaskIds?.length) {
        const rootTasks = await this.projectTaskRepo.find({
          where: { id: In(projectTaskIds), parentId: null },
          select: ['id'],
        });

        if (rootTasks.length && rootTasks.length === projectTaskIds.length) {
          const allDescendantIds = await this.collectAllDescendantIds(rootTasks);
          whereItem.id = In(allDescendantIds);
        } else whereItem.id = In(projectTaskIds);
      } else {
        whereItem = await this.projectTaskHandle.getAllDescendantIdsByUserIdWithPermission(
          isAdmin,
          user,
          {},
        );
      }
      return whereItem;
    }

    const roots = await this.projectTaskHandle.getRootProjects(
      fromDate,
      toDate,
      divisionId,
      projectTaskIds?.[0] ?? null,
    );

    if (!roots.length) return null;

    const allDescendantIds = await this.collectAllDescendantIds(roots);

    return allDescendantIds.length ? { id: In(allDescendantIds) } : null;
  }

  async fetchBaseTasks(whereItem: FindOptionsWhere<ProjectTask>, search?: string) {
    let where: FindOptionsWhere<ProjectTask>[] = [whereItem];

    if (search?.trim()) {
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'code'],
        search: search.trim(),
        whereItem,
      });
    }

    return this.projectTaskRepo.find({
      where,
      order: { createdAt: OrderType.DESC },
      relations: { createdBy: true },
      select: {
        id: true,
        name: true,
        parentId: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        estimateDate: true,
        progressPercent: true,
        isBudgetConfirmed: true,
        childrenCount: true,
        priority: true,
        createdAt: true,
        createdBy: { id: true, name: true, url: true },
      },
    });
  }

  async buildCompleteTaskHierarchy(tasks: ProjectTask[]) {
    const allTasksMap = new Map(tasks.map((t) => [t.id, t]));
    let parentsToFetch = tasks.map((t) => t.parentId).filter(Boolean) as string[];

    while (parentsToFetch.length) {
      const fetchIds = parentsToFetch.filter((id) => !allTasksMap.has(id));
      if (!fetchIds.length) break;

      const parents = await this.projectTaskRepo.find({
        where: { id: In(fetchIds) },
        relations: { createdBy: true },
        select: {
          id: true,
          name: true,
          parentId: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          estimateDate: true,
          progressPercent: true,
          childrenCount: true,
          createdBy: { id: true, name: true, url: true },
        },
      });

      if (!parents.length) break;

      for (const p of parents) allTasksMap.set(p.id, p);
      parentsToFetch = parents
        .map((p) => p.parentId)
        .filter(Boolean)
        .filter((pid) => !allTasksMap.has(pid)) as string[];
    }

    return [...allTasksMap.values()];
  }

  async fetchRelatedData(allTasks: ProjectTask[]) {
    const allTaskIds = allTasks.map((t) => t.id);

    const [dependencies, assignees] = await Promise.all([
      this.projectTaskDependencyRepo.find({
        where: { projectTaskId: In(allTaskIds) },
        select: { id: true, projectTaskId: true, dependsOnTaskId: true },
      }),
      this.projectTaskAssigneeRepo.find({
        where: { projectTaskId: In(allTaskIds), unassignedAt: IsNull() },
        relations: { orgUnit: true, user: true },
        select: {
          id: true,
          projectTaskId: true,
          orgUnit: { id: true, name: true, type: true },
          user: { id: true, name: true, url: true },
        },
      }),
    ]);

    return [dependencies, assignees] as const;
  }

  async buildEnrichedTree({ allTasks, dependencies, assignees, user, isAdmin, today }) {
    // Build dependencies map
    const dependsOnMap = new Map<string, string[]>();
    for (const d of dependencies) {
      if (!dependsOnMap.has(d.dependsOnTaskId)) dependsOnMap.set(d.dependsOnTaskId, []);
      dependsOnMap.get(d.dependsOnTaskId)!.push(d.projectTaskId);
    }

    // Build assignees map
    const assigneesByTaskId = new Map<string, typeof assignees>();
    for (const a of assignees) {
      if (!assigneesByTaskId.has(a.projectTaskId)) assigneesByTaskId.set(a.projectTaskId, []);
      assigneesByTaskId.get(a.projectTaskId)!.push(a);
    }

    const userAssignedTaskIdsSet: Set<string> = new Set(
      assignees.filter((a) => a.user?.id === user.id).map((a) => a.projectTaskId as string),
    );

    // Enrich tasks
    const idToTask = new Map<string, any>();
    const enriched = allTasks.map((task) => {
      const displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(task, today);
      const { isAssigned, isCreator, canUpdateProgress } = this.projectTaskHandle.canUserTakeAction(
        task,
        user,
        userAssignedTaskIdsSet,
      );
      const taskAssignees = assigneesByTaskId.get(task.id) || [];

      const node = {
        ...task,
        displayStatus,
        canUpdateProgress: isAdmin
          ? task.childrenCount === 0 &&
            task.type !== ProjectTaskType.PROJECT &&
            task.status !== ProjectTaskStatus.PAUSED
          : canUpdateProgress,
        isAssigned: isAdmin ? true : isAssigned,
        isCreator: isAdmin ? true : isCreator,
        users: taskAssignees
          .filter((a) => a.user?.id)
          .map((a) => ({ id: a.user!.id, name: a.user!.name, url: a.user!.url || '' })),
        children: [],
      };
      idToTask.set(task.id, node);
      return node;
    });

    // Build hierarchy
    for (const t of enriched)
      if (t.parentId && idToTask.has(t.parentId)) idToTask.get(t.parentId).children.push(t);

    // Handle dependencies
    this.reparentDependencies(enriched, dependsOnMap, idToTask);

    return { enriched, dependsOnMap, assigneesByTaskId };
  }

  reparentDependencies(
    enriched: any[],
    dependsOnMap: Map<string, string[]>,
    idToTask: Map<string, any>,
  ) {
    const dependencyChildren = new Set<string>();
    const rootCandidates = enriched.filter((t) => !t.parentId);
    const workStack = [...rootCandidates];

    while (workStack.length) {
      const node = workStack.pop();
      const dependents = dependsOnMap.get(node.id);

      if (dependents?.length) {
        for (const depId of dependents) {
          const depNode = idToTask.get(depId);
          if (!depNode) continue;

          if (depNode.parentId && idToTask.has(depNode.parentId)) {
            const oldParent = idToTask.get(depNode.parentId);
            oldParent.children = oldParent.children.filter((c) => c.id !== depNode.id);
          }

          if (!node.children.some((c) => c.id === depNode.id)) {
            node.children.push(depNode);
            dependencyChildren.add(depNode.id);
          }
        }
      }

      if (node.children?.length) workStack.push(...node.children);
    }

    return dependencyChildren;
  }

  filterAndGetRootProjects(enrichedData: any, displayStatus?: any) {
    const { enriched } = enrichedData;
    let tree = enriched.filter((t) => !t.parentId);

    if (displayStatus) {
      const statusArr = Array.isArray(displayStatus) ? displayStatus : [displayStatus];
      tree = this.filterTreeByStatus(tree, statusArr);
    }

    return tree.filter((node) => node.type === ProjectTaskType.PROJECT && node.parentId == null);
  }

  filterTreeByStatus(nodes, statusArr) {
    return nodes.reduce((acc, node) => {
      if (!node.childrenCount) {
        if (!statusArr.length || statusArr.includes(node.displayStatus)) acc.push(node);
        return acc;
      }
      const filteredChildren = this.filterTreeByStatus(node.children, statusArr);
      const keep =
        !statusArr.length || statusArr.includes(node.displayStatus) || filteredChildren.length;

      if (keep) {
        acc.push(
          filteredChildren === node.children ? node : { ...node, children: filteredChildren },
        );
      }

      return acc;
    }, []);
  }

  async processResultsWithDivisionFiltering({
    rootProjects,
    assignees,
    type,
  }: {
    rootProjects;
    assignees;
    type?;
  }) {
    const assigneesByTaskId = new Map<string, typeof assignees>();
    for (const a of assignees) {
      if (!assigneesByTaskId.has(a.projectTaskId)) assigneesByTaskId.set(a.projectTaskId, []);
      assigneesByTaskId.get(a.projectTaskId)!.push(a);
    }

    const result = [];
    for (const root of rootProjects) {
      const taskAssignees = assigneesByTaskId.get(root.id) || [];
      const orgUnitIds = taskAssignees.filter((a) => a.orgUnit?.id).map((a) => a.orgUnit!.id);

      let keep = true;
      if (orgUnitIds.length) {
        const divisions = await this.projectTaskHandle.getInfoDivisionAndDepartmentFromOrgUnits(
          orgUnitIds,
          ProjectTaskGetInfoOption.DIVISION,
        );

        if (type === ProjectTaskViewType.CROSS_DIVISION) keep = divisions.length > 1;
        else if (type === ProjectTaskViewType.DIVISION) keep = divisions.length === 1;
      } else if (
        type === ProjectTaskViewType.CROSS_DIVISION ||
        type === ProjectTaskViewType.DIVISION
      ) {
        keep = false;
      }

      if (!keep) continue;

      const stats = this.aggregateLeafStats(root);
      const convertRoot = { ...root };

      delete convertRoot.divisions;
      Object.assign(convertRoot, stats);

      result.push(convertRoot);
    }
    return result;
  }

  aggregateLeafStats(root) {
    let total = 0,
      notStarted = 0,
      inProgress = 0,
      completed = 0,
      overdue = 0;
    const stack = [...root.children];

    while (stack.length) {
      const cur = stack.pop();
      if (!cur.childrenCount) {
        total++;
        switch (cur.displayStatus) {
          case ProjectTaskDisplayStatus.NOT_STARTED:
            notStarted++;
            break;
          case ProjectTaskDisplayStatus.IN_PROGRESS:
            inProgress++;
            break;
          case ProjectTaskDisplayStatus.COMPLETED:
          case ProjectTaskDisplayStatus.COMPLETED_LATE:
            completed++;
            break;
          case ProjectTaskDisplayStatus.OVERDUE:
            overdue++;
            break;
        }
      } else if (cur.children?.length) stack.push(...cur.children);
    }

    return { total, notStarted, inProgress, completed, overdue };
  }

  // Lấy danh sách cây task của dự án
  async getListProjectTaskTree(getListProjectTaskDto: GetListProjectTaskDto, user: UserRequest) {
    const { search } = getListProjectTaskDto;
    let whereItem: FindOptionsWhere<ProjectTask> = {};
    whereItem = await this.projectTaskHandle.getAllDescendantIdsByUserIdWithPermission(
      [UserType.ADMIN, UserType.ROOT].includes(user.type),
      user,
      whereItem,
    );

    let where: FindOptionsWhere<ProjectTask>[] = [whereItem];
    if (search?.trim()) {
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'code'],
        search: search.trim(),
        whereItem,
      });
    }

    let allTasks = await this.projectTaskRepo.find({
      where,
      select: { id: true, name: true, parentId: true, type: true },
      order: { createdAt: OrderType.DESC },
    });
    if (!allTasks.length) return [];

    if (search?.trim()) {
      const allTasksMap = new Map(allTasks.map((t) => [t.id, t]));
      let parentIds = Array.from(new Set(allTasks.map((t) => t.parentId).filter(Boolean)));
      while (parentIds.length) {
        const uniqueIds = parentIds.filter((id) => !allTasksMap.has(id));
        if (!uniqueIds.length) break;
        const parents = await this.projectTaskRepo.find({
          where: { id: In(uniqueIds) },
          select: { id: true, name: true, parentId: true, type: true },
        });
        parents.forEach((p) => allTasksMap.set(p.id, p));
        parentIds = Array.from(
          new Set(
            parents
              .map((p) => p.parentId)
              .filter(Boolean)
              .filter((id) => !allTasksMap.has(id)),
          ),
        );
      }
      allTasks = Array.from(allTasksMap.values());
    }

    const taskMap = new Map<string, any>();
    allTasks.forEach((task) => {
      task.children = [];
      taskMap.set(task.id, task);
    });
    const roots = [];
    allTasks.forEach((task) => {
      if (task.parentId && taskMap.has(task.parentId))
        taskMap.get(task.parentId).children.push(task);
      else roots.push(task);
    });
    return roots;
  }

  // Lấy danh sách các dự án/task con của một task cha
  async getListProjectTaskChildren(
    id: string,
    getListProjectTaskChildrenDto: GetListProjectTaskChildrenDto,
  ) {
    const today = new Date();
    const { search, orderBy, order } = getListProjectTaskChildrenDto;
    const parent = await this.projectTaskRepo.findOne({ where: { id }, select: { id: true } });
    this.projectTaskHandle.errorNotFoundEntityWithId(parent, 'Dự án/Task', id);

    const descendants = await this.projectTaskRepo.findDescendants(parent);
    if (!descendants.length) return { total: 0, list: [] };
    const childrenOnlyIds = Array.from(
      new Set(descendants.filter((t) => t.id !== parent.id).map((t) => t.id)),
    );
    if (!childrenOnlyIds.length) return { total: 0, list: [] };

    let where: FindOptionsWhere<ProjectTask>[] = [{ id: In(childrenOnlyIds) }];
    if (search?.trim()) {
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'code'],
        search: search.trim(),
        whereItem: where[0],
      });
    }
    const selectFields = {
      id: true,
      code: true,
      name: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      estimateDate: true,
      progressPercent: true,
      parentId: true,
      weight: true,
    };
    const matchedTasks = await this.projectTaskRepo.find({
      where,
      select: selectFields,
      order: { [orderBy]: order },
    });
    if (!matchedTasks.length) return { total: 0, list: [] };

    let tree = this.projectTaskHandle.buildTree(matchedTasks);

    const allAssignees = await this.projectTaskAssigneeRepo.find({
      where: { projectTaskId: In(matchedTasks.map((t) => t.id)), unassignedAt: IsNull() },
      relations: { user: true, orgUnit: true },
      select: {
        id: true,
        projectTaskId: true,
        type: true,
        unassignedAt: true,
        user: { id: true, name: true, url: true },
        orgUnit: { id: true, name: true, type: true },
      },
    });
    const assigneesByTaskId = new Map();
    allAssignees.forEach((a) => {
      if (!assigneesByTaskId.has(a.projectTaskId)) assigneesByTaskId.set(a.projectTaskId, []);
      assigneesByTaskId.get(a.projectTaskId).push(a);
    });

    const enrichNode = (node) => {
      const assignees = assigneesByTaskId.get(node.id) || [];
      node.users = assignees
        .filter((a) => a.type === ProjectTaskAssigneeType.USER && a.user && a.unassignedAt === null)
        .map((a) => ({ id: a.user.id, name: a.user.name, url: a.user.url }));

      node.displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(node, today);

      return node;
    };
    tree = tree.map(enrichNode);
    return { total: tree.length, list: tree };
  }

  async getProjectTask(id: string, user: UserRequest) {
    const today = new Date();
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);

    const projectTask = await this.projectTaskRepo.findOne({
      relations: ['followers', 'parent'],
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        estimateDate: true,
        progressPercent: true,
        parentId: true,
        budget: true,
        weight: true,
        remainingWeight: true,
        reportAttachments: true,
        isBudgetConfirmed: true,
        createdById: true,
        lastReport: true,
        childrenCount: true,
        attachments: true,
        delayReasons: true,
        priority: true,
        description: true,
        currency: true,
        usedBudget: true,
        currencyBudget: true,
        remainingBudget: true,
        exchangeRate: true,
        followers: { id: true, name: true, url: true },
        parent: { id: true, remainingWeight: true, remainingBudget: true },
      },
    });
    this.projectTaskHandle.errorNotFoundEntityWithId(projectTask, 'Dự án/Task', id);

    const descendants = await this.projectTaskRepo.findDescendants(projectTask);
    const descendantIds = descendants.map((t) => t.id);

    const projectTaskAssignees = await this.projectTaskAssigneeRepo.find({
      where: { projectTaskId: In(descendantIds), unassignedAt: IsNull() },
      relations: { user: true, orgUnit: true },
      select: {
        id: true,
        type: true,
        userId: true,
        orgUnitId: true,
        projectTaskId: true,
        user: { id: true, name: true, url: true },
        orgUnit: { id: true, name: true, type: true },
      },
    });

    const users = [];
    const seenUserIds = new Set<string>();
    for (const a of projectTaskAssignees) {
      if (
        a.type === ProjectTaskAssigneeType.USER &&
        a.user &&
        a.projectTaskId === id &&
        !seenUserIds.has(a.user.id)
      ) {
        users.push({ id: a.user.id, name: a.user.name, url: a.user.url });
        seenUserIds.add(a.user.id);
      }
    }

    const orgUnits = [];
    const seenOrgUnitIds = new Set<string>();
    for (const a of projectTaskAssignees) {
      if (
        a.type !== ProjectTaskAssigneeType.USER &&
        a.orgUnit &&
        !seenOrgUnitIds.has(a.orgUnit.id)
      ) {
        orgUnits.push({ id: a.orgUnit.id, name: a.orgUnit.name, type: a.type });
        seenOrgUnitIds.add(a.orgUnit.id);
      }
    }

    let convertOrgUnits: { id: string; name: string; type: number }[] = [];
    if (orgUnits.length > 0) {
      const allAncestors = await this.projectTaskHandle.getInfoDivisionAndDepartmentFromOrgUnits(
        orgUnits.map((ou) => ou.id),
        ProjectTaskGetInfoOption.ALL,
      );
      const orgUnitIdSet = new Set(orgUnits.map((ou) => ou.id));
      convertOrgUnits = allAncestors.filter(
        (ou) =>
          orgUnitIdSet.has(ou.id) ||
          ou.type === OrgUnitType.DIVISION ||
          ou.type === OrgUnitType.DEPARTMENT,
      );
    }

    const proposalResult =
      projectTask.parentId === null
        ? await this.proposalRepo.findOne({
            where: { projectTaskId: projectTask.id, type: ProjectTaskProposalType.BUDGET_APPROVAL },
            order: { createdAt: OrderType.DESC },
            relations: [
              'projectTaskApprovers',
              'projectTaskApprovers.approver',
              'projectTaskFollowers',
              'projectTaskFollowers.follower',
            ],
            select: {
              id: true,
              status: true,
              createdAt: true,
              title: true,
              amount: true,
              reason: true,
              projectTaskId: true,
              projectTaskApprovers: {
                id: true,
                approver: { id: true, name: true, status: true },
              },
              projectTaskFollowers: {
                id: true,
                follower: { id: true, name: true, status: true },
              },
            },
          })
        : null;

    const userAssignedTaskIds = new Set(
      projectTaskAssignees.filter((a) => a.userId === user.id).map((a) => a.projectTaskId),
    );
    const { isAssigned, isCreator, canUpdateProgress } = this.projectTaskHandle.canUserTakeAction(
      projectTask,
      user,
      userAssignedTaskIds,
    );
    const displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(projectTask, today);

    return {
      ...projectTask,
      users,
      orgUnits,
      convertOrgUnits,
      canUpdateProgress: isAdmin
        ? projectTask.childrenCount === 0 &&
          projectTask.type !== ProjectTaskType.PROJECT &&
          projectTask.status !== ProjectTaskStatus.PAUSED
        : canUpdateProgress,
      isAssigned: isAdmin ? true : isAssigned,
      isCreator: isAdmin ? true : isCreator,
      proposal: proposalResult,
      isHaveBudget: projectTask.budget > 0,
      displayStatus,
    };
  }

  // Tỉ trọng tham gia dự án của các khối
  async getListProjectTaskStatus(id: string) {
    const today = new Date();
    const root = await this.projectTaskRepo.findOne({
      where: { id },
      select: { id: true, name: true },
    });
    this.projectTaskHandle.errorNotFoundEntityWithId(root, 'Dự án/Task', id);
    const descendants = await this.projectTaskRepo.findDescendants(root);
    const leafTasks = descendants.filter(
      (t) => t.childrenCount === 0 && t.type === ProjectTaskType.TASK,
    );
    if (!leafTasks.length) return [];

    const sumWeightAllTasks = leafTasks.reduce((sum, t) => sum + (t.weight || 0), 0);
    const leafTaskIds = leafTasks.map((t) => t.id);
    const allAssignees = await this.projectTaskAssigneeRepo.find({
      where: {
        projectTaskId: In(leafTaskIds),
        unassignedAt: IsNull(),
        orgUnit: { id: Not(IsNull()) },
      },
      relations: { orgUnit: true },
      select: { id: true, projectTaskId: true, orgUnit: { id: true, name: true, type: true } },
    });

    const assigneesByTaskId = new Map();
    allAssignees.forEach((a) => {
      if (!assigneesByTaskId.has(a.projectTaskId)) assigneesByTaskId.set(a.projectTaskId, []);
      assigneesByTaskId.get(a.projectTaskId).push(a);
    });

    const orgUnitIdsForDeptLookup = new Set();
    leafTasks.forEach((task) => {
      (assigneesByTaskId.get(task.id) || []).forEach((a) => {
        if (a.orgUnit?.id) orgUnitIdsForDeptLookup.add(a.orgUnit.id);
      });
    });
    const orgUnitIdArr = Array.from(orgUnitIdsForDeptLookup) as string[];
    const orgUnitDeptAncestors = orgUnitIdArr.length
      ? await this.projectTaskHandle.getInfoDivisionAndDepartmentFromOrgUnits(
          orgUnitIdArr,
          ProjectTaskGetInfoOption.DEPARTMENT,
        )
      : [];
    const orgUnitToDeptIds = new Map(
      (orgUnitDeptAncestors as Array<{ id: string }>).map((ou) => [ou.id, [ou.id]]),
    );

    // Department stats
    const departmentStats = new Map();
    leafTasks.forEach((task) => {
      const weight = task.weight || 0;
      const progress = task.progressPercent || 0;
      const assignees = assigneesByTaskId.get(task.id) || [];
      const departmentIds = new Set();
      assignees.forEach((a) => {
        if (a.orgUnit?.id) {
          const deptIds = orgUnitToDeptIds.get(a.orgUnit.id) || [];
          deptIds.forEach((did) => departmentIds.add(did));
        }
      });
      const share = departmentIds.size > 0 ? weight / departmentIds.size : 0;
      departmentIds.forEach((departmentId) => {
        if (!departmentStats.has(departmentId))
          departmentStats.set(departmentId, {
            totalWeight: 0,
            weightedProgress: 0,
            taskCount: 0,
            tasks: [],
          });
        const stat = departmentStats.get(departmentId);
        stat.totalWeight += share;
        stat.weightedProgress += progress * share;
        stat.taskCount++;
        stat.tasks.push(task);
      });
    });

    // Get division/department info for all orgUnitIds
    const allOrgUnitIds = Array.from(
      new Set(allAssignees.map((a) => a.orgUnit?.id).filter(Boolean)),
    );
    const divisionWithDepartments = allOrgUnitIds.length
      ? await this.projectTaskHandle.getDivisionWithDepartmentsFromOrgUnits(allOrgUnitIds)
      : [];
    const deptToDivisionMap = new Map();
    divisionWithDepartments.forEach((division) => {
      (division.departments as Array<{ departmentId: string; departmentName: string }>).forEach(
        (dept) => {
          deptToDivisionMap.set(dept.departmentId, {
            divisionId: division.divisionId,
            divisionName: division.divisionName,
            departmentName: dept.departmentName,
          });
        },
      );
    });

    // Build division map
    const divisionMap = new Map();
    departmentStats.forEach((stat, departmentId) => {
      if (!stat.taskCount || !stat.totalWeight) return;
      const deptInfo = deptToDivisionMap.get(departmentId);
      const divisionId = deptInfo?.divisionId;
      const weightedProgressPercent =
        Math.round((stat.weightedProgress / stat.totalWeight) * 10) / 10;
      const avgTimeProgressPercent =
        stat.tasks.length > 0
          ? Math.round(
              (stat.tasks.reduce((sum, task) => {
                let percent = 0;
                if (task.estimateDate && task.startDate) {
                  const start = new Date(task.startDate).getTime();
                  const end = new Date(task.estimateDate).getTime();
                  const now = today.getTime();
                  if (end > start)
                    percent = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
                }
                return sum + percent;
              }, 0) /
                stat.tasks.length) *
                10,
            ) / 10
          : 0;
      let progressWarningStatus = ProjectTaskProgressWarningStatus.SAFE;
      const gap = avgTimeProgressPercent - weightedProgressPercent;
      if (gap > 0 && gap < 20) progressWarningStatus = ProjectTaskProgressWarningStatus.WARNING;
      else if (gap >= 20) progressWarningStatus = ProjectTaskProgressWarningStatus.DANGER;
      const percent =
        sumWeightAllTasks > 0 ? Math.round((stat.totalWeight / sumWeightAllTasks) * 1000) / 10 : 0;
      const departmentObj = {
        departmentId,
        departmentName: deptInfo?.departmentName,
        taskCount: stat.taskCount,
        percent,
        avgProgressPercent: weightedProgressPercent,
        avgTimeProgressPercent,
        progressWarningStatus,
        taskIds: stat.tasks.map((t) => t.id),
      };
      if (!divisionMap.has(divisionId))
        divisionMap.set(divisionId, { divisionName: deptInfo?.divisionName, departments: [] });
      divisionMap.get(divisionId).departments.push(departmentObj);
    });

    return Array.from(divisionMap.entries()).map(([divisionId, value]) => ({
      divisionId,
      divisionName: value.divisionName,
      totalProgress:
        Math.round(value.departments.reduce((sum, dept) => sum + dept.avgProgressPercent, 0) * 10) /
        10,
      totalPercent:
        Math.round(value.departments.reduce((sum, dept) => sum + dept.percent, 0) * 10) / 10,
      departments: value.departments,
    }));
  }

  // Cập nhật trạng thái ngân sách của công việc
  async updateProjectTaskIsBudgetConfirmed(
    id: string,
    isBudgetConfirmed: boolean,
    user: UserRequest,
  ) {
    const [projectTask, assignees] = await Promise.all([
      this.projectTaskRepo.findOne({
        where: { id },
        select: {
          id: true,
          name: true,
          isBudgetConfirmed: true,
          type: true,
          createdById: true,
        },
      }),
      this.projectTaskAssigneeRepo.find({
        where: { projectTask: { id }, unassignedAt: IsNull() },
        relations: { user: true },
        select: { id: true, userId: true, user: { id: true, name: true } },
      }),
    ]);

    this.projectTaskHandle.errorNotFoundEntityWithId(projectTask, 'Dự án/Task', id);

    const notifyUserIds = assignees.map((a) => a.userId).filter((uid) => uid && uid !== user.id);

    const updatedProjectTask = await this.projectTaskRepo.save({
      id,
      isBudgetConfirmed,
      updatedById: user.id,
      budgetStatus: ProjectTaskBudgetStatus.PROJECT_HAVE_BUDGET_APPROVED,
    });

    const descendants = await this.projectTaskRepo.findDescendants(projectTask);
    const childTasks = descendants.filter((t) => t.id !== projectTask.id);
    if (childTasks.length) {
      await Promise.all(
        childTasks.map((child) =>
          this.projectTaskRepo.save({
            id: child.id,
            isBudgetConfirmed: true,
            updatedById: user.id,
          }),
        ),
      );
    }

    await this.projectTaskHistoryService.createProjectTaskHistory(
      {
        oldData: { isBudgetConfirmed: projectTask.isBudgetConfirmed },
        newData: { isBudgetConfirmed },
        type: projectTask.type,
        action: ProjectTaskHistoryAction.UPDATE,
        projectTaskId: updatedProjectTask.id,
      },
      user,
    );

    if (notifyUserIds.length) {
      await this.notificationService.createManyNotification({
        notification: {
          title: `Ngân sách ${isBudgetConfirmed ? 'đã được xác nhận' : 'đã bị từ chối'}`,
          content: `${user.name} đã ${isBudgetConfirmed ? 'xác nhận' : 'từ chối'} ngân sách cho công việc: ${projectTask.name}`,
          type: NotificationType.PROJECT_TASK,
          path: `/dashboard/project-task?projectTaskId=${id}`,
          createdById: user.id,
          userIds: notifyUserIds,
        },
        isPushFCM: true,
        manager: null,
      });
    }
  }

  // Cập nhật tiến độ và ngân sách của công việc
  async updateProjectTaskProgressAndBudget(
    id: string,
    updateProjectTaskProgress: UpdateProjectTaskProgressDto,
    user: UserRequest,
  ) {
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const { progressPercent, lastReport, ...rest } = updateProjectTaskProgress;
    const [task, assignees] = await Promise.all([
      this.projectTaskRepo.findOne({
        where: { id, type: ProjectTaskType.TASK },
        select: {
          id: true,
          progressPercent: true,
          type: true,
          startDate: true,
          name: true,
          budget: true,
          childrenCount: true,
          currencyBudget: true,
        },
      }),
      this.projectTaskAssigneeRepo.find({
        where: { projectTask: { id }, unassignedAt: IsNull() },
        relations: { user: true },
        select: {
          id: true,
          userId: true,
          user: { id: true, name: true, url: true },
        },
      }),
    ]);

    if (!task) this.projectTaskHandle.errorNotFoundEntityWithId(task, 'Task', id);

    if (task.childrenCount > 0)
      throw new BadRequestException('Không thể cập nhật tiến độ cho công việc có công việc con');

    if (!isAdmin && !assignees.some((a) => a.userId === user.id) && task.createdById !== user.id)
      throw new BadRequestException('Bạn không có quyền cập nhật tiến độ công việc này');

    if (
      (!task.currencyBudget && rest.usedBudget) ||
      (task.currencyBudget && rest.usedBudget > task.currencyBudget)
    )
      throw new BadRequestException('Số tiền đã sử dụng vượt quá ngân sách của công việc');

    const report: DeepPartial<ProjectTaskReport> = {
      ...rest,
      projectTaskId: id,
      description: lastReport,
      startDate: task.startDate,
      taskName: task.name,
      assignees: assignees.map((a) => ({
        id: a.userId,
        name: a.user?.name || '',
        url: a.user?.url || '',
      })),
      createdById: user.id,
      ...(progressPercent !== undefined && { progressPercent }),
    };

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(ProjectTask, {
          id,
          ...(rest.usedBudget !== undefined && { usedBudget: rest.usedBudget }),
          ...(progressPercent !== undefined && {
            progressPercent,
            completedAt: progressPercent === PROGRESS_COMPLETE ? new Date() : null,
          }),
          lastReport,
          reportAttachments: rest.reportAttachments,
          updatedById: user.id,
        });

        await manager.save(ProjectTaskReport, report);

        await manager.save(ProjectTaskHistory, {
          oldData: { progressPercent: task.progressPercent },
          newData: { progressPercent },
          type: task.type,
          action: ProjectTaskHistoryAction.UPDATE,
          projectTaskId: task.id,
        });

        const notifyUserIds = assignees.map((a) => a.userId).filter((id) => id && id !== user.id);

        if (notifyUserIds.length > 0) {
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Tiến độ công việc đã được cập nhật',
              content: `${user.name} đã cập nhật tiến độ công việc "${task.name}" lên ${progressPercent}%`,
              type: NotificationType.TASK_PROGRESS,
              path: `/dashboard/project-task?projectTaskId=${id}`,
              createdById: user.id,
              userIds: notifyUserIds,
            },
            isPushFCM: true,
            manager,
          });
        }

        if (progressPercent !== undefined || rest.usedBudget !== undefined)
          await this.projectTaskHandle.updateProgressRecursively(id, manager, user);
      });
      return { success: true };
    } catch (err) {
      throw new BadRequestException({ message: err.message, code: err.code, success: false });
    }
  }

  // Tạo lịch sử cập nhật công việc/dự án nếu có thay đổi
  async createUpdateHistoryIfNeeded(
    oldProjectTask: ProjectTask,
    projectUpdate: DeepPartial<ProjectTask>,
    oldAssignees: ProjectTaskAssigneeHistory[],
    newAssignees: ProjectTaskAssigneeHistory[],
    normalizedDto,
    user: UserRequest,
  ) {
    const oldTaskData = this.projectTaskHandle.normalizeDataForComparison(oldProjectTask);
    const newTaskData = this.projectTaskHandle.normalizeDataForComparison({
      ...oldProjectTask,
      ...projectUpdate,
    });

    const getIds = (arr, key) =>
      arr
        .filter((a) => !!a[key])
        .map((a) => a[key])
        .sort();
    const hasUserAssigneeChanges = !_.isEqual(
      getIds(oldAssignees, 'userId'),
      getIds(newAssignees, 'userId'),
    );
    const hasOrgUnitAssigneeChanges = !_.isEqual(
      getIds(oldAssignees, 'orgUnitId'),
      getIds(newAssignees, 'orgUnitId'),
    );
    const hasAssigneeChanges = hasUserAssigneeChanges || hasOrgUnitAssigneeChanges;

    const hasAttachmentChanges = !_.isEqual(oldTaskData.attachments, newTaskData.attachments);
    const { attachments: oldAttachments, ...oldWithoutAttachments } = oldTaskData;
    const { attachments: newAttachments, ...newWithoutAttachments } = newTaskData;
    const hasTaskChanges = !_.isEqual(oldWithoutAttachments, newWithoutAttachments);

    if (!(hasTaskChanges || hasAttachmentChanges || hasAssigneeChanges)) return;

    const changeFlags = {
      hasTaskChanges,
      hasAttachmentChanges,
      hasAssigneeChanges,
      hasUserAssigneeChanges,
      hasOrgUnitAssigneeChanges,
      hasAnyChanges: true,
    };
    const { oldData, newData } = this.projectTaskHandle.buildHistoryData(
      oldTaskData,
      newTaskData,
      oldAssignees,
      newAssignees,
      changeFlags,
    );

    this.projectTaskHistoryService.createProjectTaskHistory(
      {
        oldData,
        newData,
        type: normalizedDto.type,
        action: ProjectTaskHistoryAction.UPDATE,
        projectTaskId: oldProjectTask.id,
      },
      user,
    );
  }

  // Tạo lịch sử xác nhận ngân sách cho công việc/dự án
  async createBudgetConfirmationHistory(
    projectTask: ProjectTask,
    oldIsBudgetConfirmed: boolean,
    newIsBudgetConfirmed: boolean,
    user: UserRequest,
  ) {
    this.projectTaskHistoryService.createProjectTaskHistory(
      {
        oldData: {
          isBudgetConfirmed: oldIsBudgetConfirmed,
        },
        newData: {
          isBudgetConfirmed: newIsBudgetConfirmed,
        },
        type: projectTask.type,
        action: ProjectTaskHistoryAction.UPDATE,
        projectTaskId: projectTask.id,
      },
      user,
    );
  }

  // Dùng để lấy danh sách công việc con của một công việc/dự án cho phụ thuộc công việc
  async getListTaskById(id: string) {
    return await this.projectTaskRepo.find({
      where: { parentId: id, type: ProjectTaskType.TASK },
      select: { id: true, name: true },
    });
  }

  // Dùng để lấy danh sách dự án gốc có ngân sách --> phê duyệt ngân sách
  async getListProjectParent(getListProjectTaskDto: GetListProjectTaskDto, user: UserRequest) {
    const { search } = getListProjectTaskDto;
    let whereItem: FindOptionsWhere<ProjectTask> =
      await this.projectTaskHandle.getAllDescendantIdsByUserIdWithPermission(
        [UserType.ADMIN, UserType.ROOT].includes(user.type),
        user,
        {},
      );

    whereItem = {
      ...whereItem,
      type: ProjectTaskType.PROJECT,
      parentId: null,
    };

    let where: FindOptionsWhere<ProjectTask>[] = [whereItem];
    if (search?.trim()) {
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'code'],
        search: search.trim(),
        whereItem,
      });
    }

    return await this.projectTaskRepo.find({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        budget: true,
      },
      order: { name: OrderType.ASC },
    });
  }

  // Lấy danh sách lý do trì hoãn công việc/dự án
  async getListDelayReason(query: GetListProjectTaskDelayReasonDto) {
    const { search } = query;
    const delayReasons = Object.values(ProjectTaskDelayReason);

    if (search?.trim()) {
      const normalizedSearch = search.trim().toLowerCase();
      return delayReasons.filter((reason) => reason.toLowerCase().includes(normalizedSearch));
    }

    return delayReasons;
  }

  // Lấy lịch sử công việc/dự án theo ID
  async getListProjectTaskHistoryById(id: string) {
    return this.projectTaskHistoryService.getListProjectTaskHistoryById(id);
  }

  // Cập nhật lý do trì hoãn cho dự án gốc
  async updateProjectTaskDelayReasons(
    id: string,
    updateProjectTaskDelayReasonDto: UpdateProjectTaskDelayReasonDto,
    user: UserRequest,
  ) {
    const { delayReasons } = updateProjectTaskDelayReasonDto;

    const [assignees, task] = await Promise.all([
      this.projectTaskAssigneeRepo.find({
        where: { projectTaskId: id, unassignedAt: IsNull() },
        select: { userId: true },
      }),
      this.projectTaskRepo.findOne({
        where: { id },
        select: {
          id: true,
          name: true,
          type: true,
          createdById: true,
          delayReasons: true,
          parentId: true,
        },
      }),
    ]);

    this.projectTaskHandle.errorNotFoundEntityWithId(task, 'Dự án/Task', id);

    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const assignedIds = new Set(assignees.map((a) => a.userId));
    if (!isAdmin && !assignedIds.has(user.id) && task.createdById !== user.id)
      throw new BadRequestException(
        'Bạn không có quyền cập nhật lý do trì hoãn cho dự án/Task này',
      );

    const updateParentReasons = async (parentId: string | null, manager: EntityManager) => {
      while (parentId) {
        const children = await manager.find(ProjectTask, {
          where: { parentId },
          select: ['delayReasons'],
        });
        const reasons = Array.from(new Set(children.flatMap((c) => c.delayReasons || [])));
        await manager.save(ProjectTask, { id: parentId, delayReasons: reasons });
        const parent = await manager.findOne(ProjectTask, {
          where: { id: parentId },
          select: ['parentId'],
        });
        parentId = parent?.parentId ?? null;
      }
    };

    return this.dataSource
      .transaction(async (manager) => {
        await manager.save(ProjectTask, { id, delayReasons, updatedById: user.id });
        this.projectTaskHistoryService.createProjectTaskHistory(
          {
            oldData: { delayReasons: task.delayReasons || [] },
            newData: { delayReasons },
            type: task.type,
            action: ProjectTaskHistoryAction.UPDATE,
            projectTaskId: task.id,
          },
          user,
        );
        if (task.parentId) await updateParentReasons(task.parentId, manager);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  // Lấy danh sách người dùng liên quan đến dự án/Task -> Tags trong bình luận
  async getListUserOfProjectTask(id: string, user: UserRequest) {
    const projectTask = await this.projectTaskRepo.findOne({ where: { id } });
    if (!projectTask) throw new BadRequestException('Dự án/Task không tồn tại');

    const [ancestors, descendants] = await Promise.all([
      this.projectTaskRepo.findAncestors(projectTask),
      this.projectTaskRepo.findDescendants(projectTask),
    ]);
    const projectTaskIds = Array.from(new Set([...ancestors, ...descendants].map((t) => t.id)));

    const assignees = await this.projectTaskAssigneeRepo.find({
      where: {
        projectTaskId: In(projectTaskIds),
        unassignedAt: IsNull(),
      },
      relations: { user: true },
      select: {
        projectTaskId: true,
        orgUnitId: true,
        user: { id: true, name: true, url: true },
      },
    });

    const orgUnitIdSet = new Set<string>(
      assignees.filter((a) => a.orgUnitId).map((a) => a.orgUnitId),
    );
    const orgUnitIds = Array.from(orgUnitIdSet);

    // Parallelize ancestor fetch for orgUnits
    const allOrgUnitsArr = await Promise.all(
      orgUnitIds.map(async (orgUnitId) => {
        const orgUnit = await this.orgUnitRepo.findOne({ where: { id: orgUnitId } });
        return orgUnit ? await this.orgUnitRepo.findAncestors(orgUnit) : [];
      }),
    );
    const allOrgUnits = Array.from(new Set(allOrgUnitsArr.flat().map((ou) => ou.id)));

    const userOrgUnitPositions = allOrgUnits.length
      ? await this.userOrgUnitPositionRepo.find({
          where: { orgUnitId: In(allOrgUnits) },
          relations: { user: true },
          select: { user: { id: true, name: true, url: true } },
        })
      : [];

    const userMap = new Map<string, { id: string; name: string; url: string }>();
    for (const a of assignees) if (a.user && a.user.id !== user.id) userMap.set(a.user.id, a.user);
    for (const u of userOrgUnitPositions)
      if (u.user && u.user.id !== user.id) userMap.set(u.user.id, u.user);

    return Array.from(userMap.values());
  }
}
