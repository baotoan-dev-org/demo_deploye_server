import { BadRequestException, Injectable } from '@nestjs/common';
import { ProjectTask } from './entities/project-task.entity';
import { OtherService } from '../other/services/other.service';
import { CodeConfigType } from '../other/other.enum';
import {
  ProjectTaskBudgetStatus,
  ProjectTaskBudgetWarningGrantChart,
  ProjectTaskDisplayStatus,
  ProjectTaskGetInfoOption,
  ProjectTaskProgressWarningGrantChart,
  ProjectTaskProposalStatus,
  ProjectTaskProposalType,
  ProjectTaskStatus,
  ProjectTaskType,
} from './project-task.enum';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  Not,
  Repository,
  TreeRepository,
} from 'typeorm';
import { ProjectTaskAssignee } from './entities/project-task-assignee.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { TimeService } from '@/common/services/time.service';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import { ProjectTaskHistory } from './interfaces/project-task-history.interface';
import {
  MAX_DATE,
  MIN_DATE,
  PROGRESS_COMPLETE,
  PROGRESS_NOT_STARTED,
} from './project-task.constant';
import { OrgUnit } from '../org-unit/entities/org-unit.entity';
import { ProjectTaskAssigneeHistory } from './interfaces/project-task.interface';
import { ProjectTaskReport } from './entities/project-task-report.entity';
import { isEqual, cloneDeep } from 'lodash';
import { OrgUnitDivisionDepartment } from '../org-unit/entities/org-unit-division-department.entity';
import { QueryService } from '@/common/services/query.service';
import { NotificationType } from '../notification/notification.enum';
import { NotificationService } from '../notification/services/notification.service';
import {
  ProjectTaskProposalChangeAssigneeValue,
  ProjectTaskProposalChangeOrgUnitValue,
  ProjectTaskProposalDeadlineValue,
  ProjectTaskProposalValue,
} from './interfaces/project-task-proposal.interface';
import { ProjectTaskProposalApprover } from './entities/project-task-proposal-approver.entity';
import { ProjectTaskProposalFollower } from './entities/project-task-proposal-follower.entity';
import { ProjectTaskProposal } from './entities/project-task-proposal.entity';
import { OrgUnitType } from '../org-unit/org-unit.enum';
import { UserType } from '../user/user.enum';
@Injectable()
export class ProjectTaskHandle {
  constructor(
    @InjectRepository(ProjectTask)
    private readonly projectTaskRepo: TreeRepository<ProjectTask>,

    @InjectRepository(ProjectTaskAssignee)
    private readonly projectTaskAssigneeRepo: Repository<ProjectTaskAssignee>,

    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: TreeRepository<OrgUnit>,

    @InjectRepository(OrgUnitDivisionDepartment)
    private readonly orgUnitDivisionDepartmentRepo: Repository<OrgUnitDivisionDepartment>,

    private readonly otherService: OtherService,

    private readonly timeService: TimeService,

    private readonly queryService: QueryService,

    private readonly notificationService: NotificationService,
  ) {}

  splitMulti(value: string): string[] {
    return value
      ? value
          .split(/,|\\n|\\r|\\r\\n|\n|\r/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  }

  extractCellValue(value) {
    if (value == null) return null;
    if (typeof value === 'object') {
      if ('text' in value) return value.text;
      if ('result' in value) return value.result;
      if ('value' in value) return value.value;
    }
    return value;
  }

  errorNotFoundEntityWithId<T>(entity: T | null | undefined, entityName: string, id: string): void {
    if (!entity) throw new BadRequestException(`${entityName} với id ${id} không tồn tại`);
  }

  errorStartDateAfterEndDate(startDate: Date, endDate: Date, estimateDate: Date): void {
    const s = startDate?.getTime();
    const e = endDate?.getTime();
    const est = estimateDate?.getTime();

    if (s != null && e != null && s > e)
      throw new BadRequestException('Ngày bắt đầu không được sau ngày hoàn thành trễ nhất');

    if (est != null && e != null && est > e)
      throw new BadRequestException(
        'Ngày hoàn thành sớm nhất không được sau ngày hoàn thành trễ nhất',
      );

    if (est != null && s != null && est < s)
      throw new BadRequestException('Ngày hoàn thành sớm nhất không được trước ngày bắt đầu');

    if (est != null && s != null && e != null) {
      if (est === s && est === e)
        throw new BadRequestException(
          'Không cho phép ngày hoàn thành sớm nhất, ngày bắt đầu và ngày hoàn thành trễ nhất cùng trùng nhau',
        );
    }
  }

  errorCheckParentTimeConstraint(
    parent: ProjectTask,
    startDate: Date,
    endDate: Date,
    estimateDate: Date,
    type: string,
  ) {
    const typeProjectTask = type === ProjectTaskType.PROJECT ? 'dự án' : 'công việc';
    const typeParentProjectTask = parent.type === ProjectTaskType.PROJECT ? 'dự án' : 'công việc';
    const s = startDate?.getTime();
    const ps = parent.startDate?.getTime();
    const est = estimateDate?.getTime();
    const pest = parent.estimateDate?.getTime();
    const e = endDate?.getTime();
    const pe = parent.endDate?.getTime();

    if (ps != null && s != null && s < ps)
      throw new BadRequestException(
        `Ngày bắt đầu của ${typeProjectTask} con không được trước ngày bắt đầu của ${typeParentProjectTask} cha`,
      );

    if (pest != null && est != null && est > pest)
      throw new BadRequestException(
        `Ngày hoàn thành sớm nhất của ${typeProjectTask} con không được sau ngày hoàn thành sớm nhất của ${typeParentProjectTask} cha`,
      );

    if (pe != null && e != null && e > pe)
      throw new BadRequestException(
        `Ngày hoàn thành trễ nhất của ${typeProjectTask} con không được sau ngày hoàn thành trễ nhất của ${typeParentProjectTask} cha`,
      );
  }

  errorCheckWeightConstraint(
    weight: number | null,
    parent: ProjectTask | null,
    oldWeight: number = 0,
  ) {
    if (weight && (weight < 0 || weight > 100))
      throw new BadRequestException('Tỉ trọng không hợp lệ, phải từ 0% đến 100%');

    if (parent && parent.children && parent.children.length > 0) {
      const totalWeight = parent.children.reduce(
        (acc, child) => acc + Number(child.weight || 0),
        0,
      );
      if (totalWeight + (weight || 0) - oldWeight > 100)
        throw new BadRequestException(
          `Tổng tỉ trọng của các công việc con không được vượt quá 100%`,
        );
    }
  }

  errorCheckParentBudgetConstraint(
    parent: ProjectTask,
    budget: number | null,
    oldBudget: number | null,
  ) {
    if (!parent.isBudgetConfirmed)
      throw new BadRequestException(
        'Dự án cha chưa được xác nhận ngân sách, không thể kiểm tra ngân sách của dự án con',
      );

    const parentBudget = Number(parent.budget ?? 0);
    const newBudget = Number(budget ?? 0);
    const prevBudget = Number(oldBudget ?? 0);

    if (!parentBudget && newBudget)
      throw new BadRequestException(
        `Dự án cha không có ngân sách, không thể tạo dự án con với ngân sách`,
      );

    if (newBudget && parentBudget) {
      const childBudget =
        parent.children?.reduce((total, child) => total + Number(child.budget ?? 0), 0) ?? 0;
      const totalBudget = childBudget + newBudget - prevBudget;
      if (totalBudget > parentBudget)
        throw new BadRequestException(
          `Tổng ngân sách của các dự án con không được vượt quá ngân sách của dự án cha`,
        );
    }
  }

  async errorValidateProjectTaskAssignee(
    projectTaskAssignees: { orgUnit: { id: string } | null }[],
    orgUnitIds: string[],
  ) {
    if (!orgUnitIds.length || !projectTaskAssignees.length) return;

    const orgUnitAssigneeIds = projectTaskAssignees.map((e) => e.orgUnit?.id).filter(Boolean);
    if (!orgUnitAssigneeIds.length) return;

    const orgUnits = await this.orgUnitRepo.find({ where: { id: In(orgUnitAssigneeIds) } });
    if (!orgUnits.length) return;

    const allAssignedOrgUnitIds = new Set<string>(
      (
        await Promise.all(
          orgUnits.map(async (orgUnit) => {
            const tree = await this.orgUnitRepo.findDescendantsTree(orgUnit);
            const ids: string[] = [];
            const stack = [tree];
            while (stack.length) {
              const node = stack.pop();
              if (node?.id) ids.push(node.id);
              if (node?.children?.length) stack.push(...node.children);
            }
            return ids;
          }),
        )
      ).flat(),
    );

    for (const id of orgUnitIds) {
      if (!allAssignedOrgUnitIds.has(id)) {
        throw new BadRequestException(
          `Đơn vị với ID ${id} không được phân công vào dự án hoặc là con của đơn vị được phân công`,
        );
      }
    }
  }

  errorCheckValidateParentTimeWithChildren(parent: ProjectTask) {
    if (parent && parent.children && parent.children.length > 0) {
      for (const child of parent.children) {
        if (parent.startDate && child.startDate && child.startDate < parent.startDate)
          throw new BadRequestException(
            'Ngày bắt đầu của cha phải nhỏ hơn hoặc bằng ngày bắt đầu của con',
          );

        if (parent.endDate && child.endDate && child.endDate > parent.endDate)
          throw new BadRequestException(
            'Ngày kết thúc của cha phải lớn hơn hoặc bằng ngày kết thúc của con',
          );

        if (parent.estimateDate && child.estimateDate && child.estimateDate > parent.estimateDate)
          throw new BadRequestException(
            'Ngày ước tính hoàn thành của cha phải lớn hơn hoặc bằng của con',
          );
      }
    }
  }

  errorCheckPermission(isAdmin: boolean, parentId: string, allDescendantIds: string[]) {
    if (!isAdmin && parentId && !allDescendantIds.includes(parentId))
      throw new BadRequestException('Bạn không có quyền truy cập vào dự án/task này');
  }

  buildTree(list: ProjectTask[]) {
    const idMap = new Map();
    list.forEach((item) => idMap.set(item.id, { ...item, children: [] }));
    const tree = [];
    list.forEach((item) => {
      if (item.parentId && idMap.has(item.parentId))
        idMap.get(item.parentId).children.push(idMap.get(item.id));
      else tree.push(idMap.get(item.id));
    });
    return tree;
  }

  async generateCode(type: string, parentId: string, manager: EntityManager) {
    let codeType: CodeConfigType | undefined;
    if (parentId)
      codeType =
        type === ProjectTaskType.PROJECT
          ? CodeConfigType.SDA
          : type === ProjectTaskType.TASK
            ? CodeConfigType.SCV
            : undefined;
    else
      codeType =
        type === ProjectTaskType.PROJECT
          ? CodeConfigType.DA
          : type === ProjectTaskType.TASK
            ? CodeConfigType.CV
            : type === ProjectTaskType.TODO
              ? CodeConfigType.TODO
              : undefined;

    if (!codeType) throw new BadRequestException(`Không tìm thấy loại mã cho ${type}`);
    return this.otherService.generateCode(codeType, 5, manager);
  }

  async updateProgressRecursively(
    projectTaskId: string,
    manager: EntityManager,
    user: UserRequest,
  ) {
    const projectTask = await manager.findOne(ProjectTask, { where: { id: projectTaskId } });
    if (!projectTask) return;
    const children = await manager.find(ProjectTask, { where: { parentId: projectTask.id } });
    const childrenCount = children.length;
    let needUpdate = false;

    if (childrenCount > 0) {
      const completedChildrenCount = children.filter(
        (c) => c.progressPercent === PROGRESS_COMPLETE,
      ).length;
      const totalWeight = children.reduce((acc, c) => acc + Number(c.weight ?? 0), 0);
      const avgProgress =
        totalWeight > 0
          ? Math.round(
              children.reduce(
                (acc, c) => acc + (c.progressPercent || 0) * Number(c.weight ?? 0),
                0,
              ) / totalWeight,
            )
          : Math.round(
              children.reduce((acc, c) => acc + (c.progressPercent || 0), 0) / childrenCount,
            );
      const totalUsedBudget = children.reduce((acc, c) => acc + Number(c.usedBudget ?? 0), 0);

      if (
        projectTask.progressPercent !== avgProgress ||
        projectTask.childrenCount !== childrenCount ||
        projectTask.completedChildrenCount !== completedChildrenCount ||
        projectTask.usedBudget !== totalUsedBudget
      ) {
        projectTask.progressPercent = avgProgress;
        projectTask.completedAt = avgProgress === PROGRESS_COMPLETE ? new Date() : null;
        projectTask.childrenCount = childrenCount;
        projectTask.completedChildrenCount = completedChildrenCount;
        projectTask.usedBudget = totalUsedBudget;
        needUpdate = true;
      }
    } else {
      if (projectTask.childrenCount !== 0 || projectTask.completedChildrenCount !== 0) {
        projectTask.childrenCount = 0;
        projectTask.completedChildrenCount = 0;
        needUpdate = true;
      }
    }

    if (needUpdate) {
      await manager.save(ProjectTask, projectTask);
      if (user) {
        await manager.save(ProjectTaskReport, {
          projectTaskId: projectTask.id,
          progressPercent: projectTask.progressPercent || 0,
          startDate: projectTask.startDate,
          taskName: projectTask.name,
          createdById: user.id,
          createdAt: new Date(),
        });
      }
    }
    if (projectTask.parentId) {
      await this.updateProgressRecursively(projectTask.parentId, manager, user);
    }
  }

  async updateRemainingWeight(
    parent: ProjectTask,
    manager: EntityManager,
    newWeight: number,
    oldWeight: number = 0,
  ) {
    if (!parent) return;

    let totalWeight = 0;
    if (parent.childrenCount > 0) {
      totalWeight = parent.children.reduce((acc, child) => {
        return acc + (child.weight ? Number(child.weight) : 0);
      }, 0);
    }

    const remainingWeight = 100 - totalWeight - (newWeight || 0) + oldWeight;
    await manager.save(ProjectTask, { id: parent.id, remainingWeight });
  }

  async getAllDescendantIdsByUserId(
    isAdmin: boolean,
    userId: string,
    orgUnitId: string,
  ): Promise<string[]> {
    if (isAdmin || !orgUnitId) return [];

    const orgUnit = await this.orgUnitRepo.findOne({ where: { id: orgUnitId } });
    if (!orgUnit) return [];

    const descendantOrgUnits = await this.orgUnitRepo.findDescendants(orgUnit);
    const descendantOrgUnitIds = descendantOrgUnits.map((d) => d.id).filter(Boolean);

    // Get all related projectTask IDs (assigned, created, followed)
    const [assignees, createdTasks, followerTasks] = await Promise.all([
      this.projectTaskAssigneeRepo.find({
        where: [
          { userId, unassignedAt: IsNull() },
          ...descendantOrgUnitIds.map((id) => ({ orgUnitId: id, unassignedAt: IsNull() })),
        ],
        select: ['projectTaskId'],
      }),
      this.projectTaskRepo.find({
        where: { createdById: userId },
        select: ['id'],
      }),
      this.projectTaskRepo.find({
        where: { followers: { id: userId } },
        select: ['id'],
        relations: ['followers'],
      }),
    ]);

    const rootTaskIds = Array.from(
      new Set([
        ...assignees.map((a) => a.projectTaskId),
        ...createdTasks.map((t) => t.id),
        ...followerTasks.map((t) => t.id),
      ]),
    );
    if (rootTaskIds.length === 0) return [];

    // Query parentId for all rootTaskIds in one batch
    const tasksWithParent = await this.projectTaskRepo.find({
      where: { id: In(rootTaskIds) },
      select: ['id', 'parentId'],
    });
    const parentMap = new Map<string, string | null>();
    for (const task of tasksWithParent) parentMap.set(task.id, task.parentId ?? null);

    // Find top-level parent IDs for each task
    const topLevelParentIds = new Set<string>();
    for (const taskId of rootTaskIds) {
      let currentId = taskId;
      let parentId: string | null | undefined = undefined;
      while (true) {
        parentId = parentMap.get(currentId);
        if (!parentId) break;
        currentId = parentId;
      }
      topLevelParentIds.add(currentId);
    }

    // Query descendants for all top-level parent IDs in one batch
    const parentTasks = await this.projectTaskRepo.find({
      where: { id: In(Array.from(topLevelParentIds)) },
    });
    const allIdSet = new Set<string>();
    for (const parentTask of parentTasks) {
      const descendants = await this.projectTaskRepo.findDescendants(parentTask);
      for (const desc of descendants) if (desc.id) allIdSet.add(desc.id);
    }
    return Array.from(allIdSet);
  }

  async getAllTopDescendantIdsByUserId(userId: string, orgUnitId: string): Promise<string[]> {
    if (!orgUnitId) return [];

    const orgUnit = await this.orgUnitRepo.findOne({ where: { id: orgUnitId } });
    if (!orgUnit) return [];
    const descendantOrgUnits = await this.orgUnitRepo.findDescendants(orgUnit);
    const descendantOrgUnitIds = descendantOrgUnits.map((d) => d.id).filter(Boolean);

    const assigneeWhere = [
      { userId, unassignedAt: IsNull() },
      ...descendantOrgUnitIds.map((id) => ({ orgUnitId: id, unassignedAt: IsNull() })),
    ];
    const [assignees, createdTasks] = await Promise.all([
      this.projectTaskAssigneeRepo.find({
        where: assigneeWhere,
        select: ['projectTaskId'],
      }),
      this.projectTaskRepo.find({
        where: { createdById: userId },
        select: ['id'],
      }),
    ]);
    const rootTaskIds = Array.from(
      new Set([...assignees.map((a) => a.projectTaskId), ...createdTasks.map((t) => t.id)]),
    );
    if (rootTaskIds.length === 0) return [];

    // Batch-fetch all parent relationships
    const tasksWithParent = await this.projectTaskRepo.find({
      where: { id: In(rootTaskIds) },
      select: ['id', 'parentId'],
    });
    const parentMap = new Map<string, string | null>();
    for (const task of tasksWithParent) parentMap.set(task.id, task.parentId ?? null);

    // Traverse parent relationships in memory
    const topLevelParentIds = new Set<string>();
    for (const taskId of rootTaskIds) {
      let currentId = taskId;
      let parentId: string | null | undefined = undefined;
      while (true) {
        parentId = parentMap.get(currentId);
        if (!parentId) break;
        currentId = parentId;
      }
      topLevelParentIds.add(currentId);
    }

    return Array.from(topLevelParentIds);
  }

  normalizeTaskDates(task: ProjectTask) {
    if (!task) return task;
    return {
      ...task,
      startDate: this.timeService.getDateFromString(task.startDate),
      endDate: this.timeService.getDateFromString(task.endDate),
      estimateDate: this.timeService.getDateFromString(task.estimateDate),
    };
  }

  normalizeDataForComparison(data) {
    if (!data) return data;
    const normalized = cloneDeep(data);

    if (normalized.budget != null) normalized.budget = Number(normalized.budget);

    if (Array.isArray(normalized.attachments)) {
      normalized.attachments = normalized.attachments
        .map((a) => ({ url: a.url || '', name: a.name || '' }))
        .sort((a, b) => a.url.localeCompare(b.url) || a.name.localeCompare(b.name));
    } else if (normalized.attachments !== undefined) normalized.attachments = [];

    if (normalized.progressPercent != null)
      normalized.progressPercent = Number(normalized.progressPercent);

    if ('isBudgetConfirmed' in normalized)
      normalized.isBudgetConfirmed = Boolean(normalized.isBudgetConfirmed);

    return normalized;
  }

  normalizeAssigneeData(assignees) {
    if (!Array.isArray(assignees)) return [];
    return assignees
      .map(
        ({
          userId = null,
          name = null,
          orgUnitId = null,
          orgUnitName = null,
          url = null,
          type = null,
        }) => ({
          userId,
          name,
          orgUnitId,
          orgUnitName,
          url,
          type,
        }),
      )
      .sort(
        (a, b) =>
          (a.userId ?? '').toString().localeCompare((b.userId ?? '').toString()) ||
          (a.orgUnitId ?? '').toString().localeCompare((b.orgUnitId ?? '').toString()),
      );
  }

  buildHistoryData(
    oldTaskData: ProjectTask,
    newTaskData: ProjectTask,
    oldAssignees: ProjectTaskAssigneeHistory[],
    newAssignees: ProjectTaskAssigneeHistory[],
    changeFlags: {
      hasTaskChanges: boolean;
      hasAttachmentChanges: boolean;
      hasAssigneeChanges: boolean;
      hasUserAssigneeChanges: boolean;
      hasOrgUnitAssigneeChanges: boolean;
      hasAnyChanges?: boolean;
    },
  ) {
    const oldData: ProjectTaskHistory = {};
    const newData: ProjectTaskHistory = {};

    if (changeFlags.hasTaskChanges) {
      const normalizedOldTask = this.normalizeTaskDates(oldTaskData);
      const normalizedNewTask = this.normalizeTaskDates(newTaskData);
      const { attachments: _, ...oldTaskFields } = normalizedOldTask;
      const { attachments: __, ...newTaskFields } = normalizedNewTask;
      const allKeys = new Set([...Object.keys(oldTaskFields), ...Object.keys(newTaskFields)]);
      for (const key of allKeys) {
        if (key === 'startDate' || key === 'endDate' || key === 'estimateDate') {
          const v1 = oldTaskFields[key];
          const v2 = newTaskFields[key];
          if (this.timeService.compareDateField(v1, v2)) {
            oldData[key] = v1;
            newData[key] = v2;
          }
        } else if (!isEqual(oldTaskFields[key], newTaskFields[key])) {
          oldData[key] = oldTaskFields[key];
          newData[key] = newTaskFields[key];
        }
      }
    }

    if (changeFlags.hasAttachmentChanges) {
      oldData.attachments = this.normalizeAttachments(oldTaskData.attachments);
      newData.attachments = this.normalizeAttachments(newTaskData.attachments);
    }

    if (changeFlags.hasAssigneeChanges) {
      let filterFn = null;
      if (changeFlags.hasUserAssigneeChanges && !changeFlags.hasOrgUnitAssigneeChanges)
        filterFn = (a) => !!a.userId;
      else if (!changeFlags.hasUserAssigneeChanges && changeFlags.hasOrgUnitAssigneeChanges)
        filterFn = (a) => !!a.orgUnitId;

      oldData.assignees = this.normalizeAssigneeData(
        filterFn ? oldAssignees.filter(filterFn) : oldAssignees,
      );
      newData.assignees = this.normalizeAssigneeData(
        filterFn ? newAssignees.filter(filterFn) : newAssignees,
      );
    }

    return { oldData, newData };
  }

  normalizeAttachments(attachments: AttachmentDto[]): { url: string; name: string }[] {
    if (!Array.isArray(attachments)) return [];
    return attachments
      .map(({ url = '', name = '' }) => ({ url, name }))
      .sort((a, b) => a.url.localeCompare(b.url) || a.name.localeCompare(b.name));
  }

  calculateTaskDisplayStatus(task: ProjectTask, today: Date): string {
    if (task.status === ProjectTaskStatus.PAUSED) {
      return ProjectTaskDisplayStatus.PAUSED;
    }
    if (
      (task.progressPercent === PROGRESS_NOT_STARTED || !task.progressPercent) &&
      task.startDate &&
      task.startDate > today
    )
      return ProjectTaskDisplayStatus.NOT_STARTED;

    if (task.progressPercent === PROGRESS_COMPLETE) {
      if (task.endDate && task.completedAt) {
        if (new Date(task.completedAt) > new Date(task.endDate))
          return ProjectTaskDisplayStatus.COMPLETED_LATE;
        return ProjectTaskDisplayStatus.COMPLETED;
      }
      if (task.endDate && task.endDate < today) return ProjectTaskDisplayStatus.COMPLETED_LATE;
      return ProjectTaskDisplayStatus.COMPLETED;
    }
    if (task.endDate && task.endDate < today) return ProjectTaskDisplayStatus.OVERDUE;
    return ProjectTaskDisplayStatus.IN_PROGRESS;
  }

  canUserTakeAction(task: ProjectTask, user: UserRequest, userAssignedTaskIds: Set<string>) {
    const isUpdateProgress =
      userAssignedTaskIds.has(task.id) &&
      task.type === ProjectTaskType.TASK &&
      task.childrenCount === 0 &&
      task.status !== ProjectTaskStatus.PAUSED;
    return {
      isAssigned: userAssignedTaskIds.has(task.id),
      isCreator: task.createdById === user.id,
      canUpdateProgress: isUpdateProgress,
    };
  }

  calculateTimeProjectTask(task: ProjectTask, today: Date) {
    const elapsedTime = task.startDate ? today.getTime() - task.startDate.getTime() : 0;
    const estimatedTime = task.estimateDate
      ? task.estimateDate.getTime() - (task.startDate?.getTime() || today.getTime())
      : 0;
    const overdueTime = task.endDate
      ? task.endDate.getTime() - (task.startDate?.getTime() || today.getTime())
      : 0;
    const percentLeft =
      estimatedTime > 0 ? Math.max(0, Math.min(1, 1 - elapsedTime / estimatedTime)) : 0;
    const percentLeftOverdue =
      overdueTime > 0 ? Math.max(0, Math.min(1, 1 - elapsedTime / overdueTime)) : 0;
    const roundInt = (val: number) => Math.round(val);
    return {
      timeProgressPercent: roundInt(percentLeft * 100),
      overdueProgressPercent: roundInt(percentLeftOverdue * 100),
    };
  }

  calculateProgressWarning(
    actualProgress: number,
    overdueEnd?: Date,
    today?: Date,
    startDate?: Date,
  ): {
    warning: ProjectTaskProgressWarningGrantChart;
    progressGap: number;
    minExpectedProgress: number;
  } {
    if (!startDate || !overdueEnd || !today)
      return {
        warning: ProjectTaskProgressWarningGrantChart.ON_TRACK,
        progressGap: 0,
        minExpectedProgress: 0,
      };

    if (today < startDate)
      return {
        warning: ProjectTaskProgressWarningGrantChart.ON_TRACK,
        progressGap: 0,
        minExpectedProgress: 0,
      };

    const totalDuration = overdueEnd.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    let minExpectedProgress = 0;
    if (totalDuration > 0)
      minExpectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    if (today > overdueEnd) minExpectedProgress = 100;
    const progressGap = Math.round(minExpectedProgress - actualProgress);

    let warning: ProjectTaskProgressWarningGrantChart =
      ProjectTaskProgressWarningGrantChart.ON_TRACK;
    if (progressGap > 20) warning = ProjectTaskProgressWarningGrantChart.OVERDUE;
    else if (progressGap > 0) warning = ProjectTaskProgressWarningGrantChart.BEHIND;
    else warning = ProjectTaskProgressWarningGrantChart.ON_TRACK;

    return {
      warning,
      progressGap,
      minExpectedProgress: Math.round(minExpectedProgress),
    };
  }

  calculateBudgetWarning(
    totalBudget: number,
    actualBudget: number,
    overdueEnd?: Date,
    today?: Date,
    startDate?: Date,
  ) {
    if (!startDate || !overdueEnd || !today || !actualBudget || !totalBudget)
      return {
        warning: ProjectTaskBudgetWarningGrantChart.ON_BUDGET,
        minExpectedBudget: 0,
      };

    const totalDuration = overdueEnd.getTime() - startDate.getTime();
    if (totalDuration <= 0)
      return {
        warning: ProjectTaskBudgetWarningGrantChart.ON_BUDGET,
        minExpectedBudget: 0,
      };

    const elapsed = today.getTime() - startDate.getTime();
    let elapsedPercent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    if (today > overdueEnd) elapsedPercent = 100;

    let usedBudgetPercent = 0;
    if (totalBudget > 0)
      usedBudgetPercent = Math.max(0, Math.min(100, (actualBudget / totalBudget) * 100));

    const minExpectedBudget = Math.round((totalBudget * elapsedPercent) / 100);

    if (usedBudgetPercent > elapsedPercent + 20)
      return {
        warning: ProjectTaskBudgetWarningGrantChart.ABOVE_BUDGET,
        minExpectedBudget,
      };

    if (usedBudgetPercent < elapsedPercent - 20)
      return {
        warning: ProjectTaskBudgetWarningGrantChart.BELOW_BUDGET,
        minExpectedBudget,
      };

    return {
      warning: ProjectTaskBudgetWarningGrantChart.ON_BUDGET,
      minExpectedBudget,
    };
  }

  async getAllDescendantIdsByUserIdWithPermission(
    isAdmin: boolean,
    user: UserRequest,
    whereItem: FindOptionsWhere<ProjectTask> = {},
  ): Promise<FindOptionsWhere<ProjectTask>> {
    if (!isAdmin) {
      const allDescendantIds = await this.getAllDescendantIdsByUserId(
        isAdmin,
        user.id,
        user?.orgUnitId,
      );
      if (!allDescendantIds?.length) whereItem.id = IsNull();
      else whereItem.id = In(allDescendantIds);
    }
    return whereItem;
  }

  getTimeCoefficient(task: ProjectTask, reportMap: Map<string, Date>, today: Date) {
    const start = task.startDate ? new Date(task.startDate).getTime() : null;
    const endLatest = task.estimateDate ? new Date(task.estimateDate).getTime() : null;
    const finishDate = reportMap.get(task.id) ? new Date(reportMap.get(task.id)).getTime() : null;
    if (!start || !endLatest) return 0;
    if (task.progressPercent === PROGRESS_COMPLETE && finishDate && finishDate <= endLatest)
      return 1;
    if (task.progressPercent === PROGRESS_COMPLETE && finishDate && finishDate > endLatest) {
      const lateDays = (finishDate - endLatest) / 86400000;
      const plannedDays = (endLatest - start) / 86400000;
      return plannedDays > 0 ? 1 - lateDays / plannedDays : 0;
    }
    if (today.getTime() > endLatest) {
      const overdueDays = (today.getTime() - endLatest) / 86400000;
      const plannedDays = (endLatest - start) / 86400000;
      return plannedDays > 0 ? 1 - overdueDays / plannedDays : 0;
    }
    const elapsedDays = (today.getTime() - start) / 86400000;
    const plannedDays = (endLatest - start) / 86400000;
    return plannedDays > 0 ? elapsedDays / plannedDays : 0;
  }

  async getManagerOfOrgUnits(orgUnitIds: string[]) {
    if (!orgUnitIds?.length) return [];
    const orgUnits = await this.orgUnitRepo.find({
      where: { id: In(orgUnitIds) },
      relations: ['manager'],
      select: {
        manager: {
          id: true,
        },
      },
    });

    return orgUnits
      .map((ou) => ou.manager)
      .filter(Boolean)
      .map((m) => m.id);
  }

  async getInfoDivisionAndDepartmentFromOrgUnits(
    orgUnitIds: string[],
    type: ProjectTaskGetInfoOption,
    search?: string,
  ) {
    // all thì lấy cả 2 type 3, 5 (Phòng ban và Bộ phận)
    // department thì lấy type 5 (Bộ phận)
    // division thì lấy type 3 (Phòng ban)
    if (type !== 'all' && type !== 'department' && type !== 'division')
      throw new BadRequestException('Type không hợp lệ, chỉ chấp nhận all, department, division');

    if (!orgUnitIds?.length) return [];

    const mappings = await this.orgUnitDivisionDepartmentRepo.find({
      where: [
        { orgUnitId: In(orgUnitIds), divisionId: Not(IsNull()) },
        { orgUnitId: In(orgUnitIds), departmentId: Not(IsNull()) },
      ],
      select: ['divisionId', 'departmentId'],
    });

    const divisionIds = Array.from(new Set(mappings.map((m) => m.divisionId).filter(Boolean)));
    const departmentIds = Array.from(new Set(mappings.map((m) => m.departmentId).filter(Boolean)));

    let idsToFetch = [];
    if (type === 'all') idsToFetch = [...divisionIds, ...departmentIds];
    else if (type === 'division') idsToFetch = divisionIds;
    else if (type === 'department') idsToFetch = departmentIds;

    if (!idsToFetch.length) return [];

    let whereItem: FindOptionsWhere<OrgUnit> = { id: In(idsToFetch) };
    let whereDivision: FindOptionsWhere<OrgUnit>[] = [whereItem];

    if (search) {
      whereDivision = this.queryService.search({
        arrayPropertyLike: ['name'],
        search,
        whereItem: whereItem,
      });
    }

    const orgUnits = await this.orgUnitRepo.find({
      where: whereDivision,
      select: {
        id: true,
        name: true,
        type: true,
        manager: {
          id: true,
          name: true,
          url: true,
        },
      },
      relations: ['manager'],
    });

    return orgUnits.map((ou) => ({ id: ou.id, name: ou.name, type: ou.type, manager: ou.manager }));
  }

  async getDivisionWithDepartmentsFromOrgUnits(orgUnitIds: string[]) {
    if (!orgUnitIds?.length) return [];
    const mappings = await this.orgUnitDivisionDepartmentRepo.find({
      where: [
        { orgUnitId: In(orgUnitIds), divisionId: Not(IsNull()), departmentId: Not(IsNull()) },
      ],
      select: ['divisionId', 'departmentId'],
    });

    const divisionIds = Array.from(new Set(mappings.map((m) => m.divisionId).filter(Boolean)));
    const departmentIds = Array.from(new Set(mappings.map((m) => m.departmentId).filter(Boolean)));
    if (!divisionIds.length || !departmentIds.length) return [];

    const orgUnits = await this.orgUnitRepo.find({
      where: { id: In([...divisionIds, ...departmentIds]) },
      select: { id: true, name: true, type: true },
    });
    const orgUnitMap = new Map(orgUnits.map((ou) => [ou.id, ou]));

    const divisionMap = new Map();
    for (const m of mappings) {
      const division = orgUnitMap.get(m.divisionId);
      const department = orgUnitMap.get(m.departmentId);
      if (!division || !department) continue;
      if (!divisionMap.has(division.id)) {
        divisionMap.set(division.id, {
          divisionId: division.id,
          divisionName: division.name,
          departments: new Set(),
        });
      }
      divisionMap
        .get(division.id)
        .departments.add({ departmentId: department.id, departmentName: department.name });
    }

    return Array.from(divisionMap.values()).map((d) => ({
      divisionId: d.divisionId,
      divisionName: d.divisionName,
      departments: Array.from(d.departments),
    }));
  }

  getBudgetConfirmationAndStatus({
    parentId,
    budget,
    approverIds,
    allApproversAreCreator,
    oldBudget,
    oldIsBudgetConfirmed,
  }: {
    parentId: string | undefined;
    budget: number | undefined;
    approverIds: string[];
    allApproversAreCreator: boolean;
    oldBudget?: number | undefined;
    oldIsBudgetConfirmed?: boolean | undefined;
  }): { isBudgetConfirmed: boolean; budgetStatus: string | null } {
    // Task/Project con luôn được confirm budget tự động
    if (parentId) return { isBudgetConfirmed: true, budgetStatus: null };

    const isBudgetUnchanged =
      typeof oldBudget !== 'undefined' && Number(oldBudget ?? 0) === Number(budget ?? 0);

    if (isBudgetUnchanged) {
      return {
        isBudgetConfirmed: oldIsBudgetConfirmed ?? false,
        budgetStatus: null,
      };
    }

    // Project/Task gốc không có budget
    if (!budget) {
      return {
        isBudgetConfirmed: true,
        budgetStatus: ProjectTaskBudgetStatus.PROJECT_NOT_HAVE_BUDGET,
      };
    }

    const hasApprovers = approverIds.length > 0;
    const isBudgetConfirmed = hasApprovers ? allApproversAreCreator : false;
    const budgetStatus =
      hasApprovers && allApproversAreCreator
        ? ProjectTaskBudgetStatus.PROJECT_HAVE_BUDGET_APPROVED
        : ProjectTaskBudgetStatus.PROJECT_HAVE_BUDGET_PENDING;

    return { isBudgetConfirmed, budgetStatus };
  }

  async getRootProjects(
    fromDate?: string,
    toDate?: string,
    divisionId?: string,
    projectTaskId?: string,
  ): Promise<ProjectTask[]> {
    let baseWhere: FindOptionsWhere<ProjectTask> = {};
    let projectIds: string[] | undefined;

    if (projectTaskId) {
      baseWhere = { parentId: projectTaskId };
    } else {
      baseWhere = {
        type: ProjectTaskType.PROJECT,
        parentId: IsNull(),
      };

      if (divisionId) {
        const assignees = await this.projectTaskAssigneeRepo.find({
          where: [{ orgUnit: { id: divisionId } }, { orgUnit: { parent: { id: divisionId } } }],
          select: ['projectTaskId'],
        });
        projectIds = assignees.map((assignee) => assignee.projectTaskId);
        if (!projectIds.length) return [];
      }
    }

    const hasDateFilter = fromDate || toDate;
    const dateRange = hasDateFilter
      ? Between(
          fromDate ? new Date(fromDate) : new Date(MIN_DATE),
          toDate ? new Date(toDate) : new Date(MAX_DATE),
        )
      : undefined;

    const baseCondition = {
      ...baseWhere,
      ...(projectIds?.length ? { id: In(projectIds) } : {}),
    };

    const dateWhere: FindOptionsWhere<ProjectTask>[] = hasDateFilter
      ? [
          { ...baseCondition, startDate: dateRange },
          { ...baseCondition, endDate: dateRange },
        ]
      : [baseCondition];

    return await this.projectTaskRepo.find({
      where: dateWhere,
      select: ['id'],
    });
  }

  async createBudgetProjectTaskProposalAndNotify({
    manager,
    proposalParams,
    approverIds,
    followerIds,
    user,
    proposalPath,
    oldProposals,
  }: {
    manager: EntityManager;
    proposalParams: DeepPartial<ProjectTaskProposal>;
    approverIds: string[];
    followerIds: string[];
    user: UserRequest;
    proposalPath: string;
    oldProposals?: ProjectTaskProposal[];
  }) {
    if (oldProposals && oldProposals.length)
      await manager.delete(ProjectTaskProposal, {
        id: In(oldProposals.map((p) => p.id)),
      });

    const proposalInsert: DeepPartial<ProjectTaskProposal> = {
      id: proposalParams.id,
      code: await this.otherService.generateCode(CodeConfigType.DX, 5, manager),
      ...proposalParams,
    };

    const proposal = await manager.save(ProjectTaskProposal, proposalInsert);
    const approverEntities = approverIds.map((userId: string) => ({
      proposal: { id: proposal.id },
      approver: { id: userId },
      status:
        userId === user.id ? ProjectTaskProposalStatus.APPROVED : ProjectTaskProposalStatus.PENDING,
    }));
    const followerEntities = followerIds.map((userId: string) => ({
      proposal: { id: proposal.id },
      follower: { id: userId },
    }));

    await this.notificationService.createManyNotification({
      notification: {
        title: 'Đề xuất mới',
        content: `${user.name} đã tạo đề xuất mới cho công việc`,
        type: NotificationType.PROPOSAL,
        path: `${proposalPath}${proposal.id}`,
        createdById: user.id,
        userIds: approverIds.filter((id: string) => id !== user.id),
      },
      isPushFCM: true,
      manager,
    });
    if (followerEntities.length > 0) {
      await this.notificationService.createManyNotification({
        notification: {
          title: 'Đề xuất mới',
          content: `${user.name} đã thêm bạn vào danh sách theo dõi đề xuất`,
          type: NotificationType.PROPOSAL,
          path: `${proposalPath}${proposal.id}`,
          createdById: user.id,
          userIds: followerIds.filter((id: string) => id !== user.id),
        },
        isPushFCM: true,
        manager,
      });
      await manager.save(ProjectTaskProposalFollower, followerEntities);
    }
    await manager.save(ProjectTaskProposalApprover, approverEntities);
  }

  errorNotExistProjectTask(projectTaskId?: string, projectTask?: ProjectTask): void {
    if (projectTaskId && !projectTask) {
      throw new BadRequestException('Công việc không tồn tại');
    }
  }

  errorCheckProjectTaskProposalValidation(
    type: string,
    amount: number,
    progressAtRequest: number,
    newValue: ProjectTaskProposalValue,
    oldValue: ProjectTaskProposalValue,
  ): void {
    const throwIfMissing = (cond: boolean, msg: string) => {
      if (cond) throw new BadRequestException(msg);
    };
    const checkArray = (arr: any[], msg: string) =>
      throwIfMissing(!arr || !Array.isArray(arr) || arr.length === 0, msg);
    const checkIds = (arr: any[], msg: string) =>
      arr.forEach((item) => throwIfMissing(!item || !item.id, msg));

    if (type === ProjectTaskProposalType.BUDGET_APPROVAL)
      throwIfMissing(amount == null, 'Số tiền đề xuất không được để trống');

    if (
      [
        ProjectTaskProposalType.EXTEND_DEADLINE,
        ProjectTaskProposalType.CHANGE_ASSIGNEE,
        ProjectTaskProposalType.CHANGE_ORG_UNIT,
      ].includes(type as ProjectTaskProposalType)
    )
      throwIfMissing(progressAtRequest == null, 'Tiến độ đề xuất không được để trống');

    if (type === ProjectTaskProposalType.EXTEND_DEADLINE && newValue && oldValue) {
      const { oldEndDate, oldEstimateDate } = oldValue as ProjectTaskProposalDeadlineValue;
      const { newEndDate, newEstimateDate } = newValue as ProjectTaskProposalDeadlineValue;
      throwIfMissing(
        !oldEndDate || !oldEstimateDate,
        'Thiếu thông tin ngày kết thúc hoặc ngày ước tính cũ',
      );
      throwIfMissing(
        !newEndDate || !newEstimateDate,
        'Thiếu thông tin ngày kết thúc hoặc ngày ước tính mới',
      );
      const oldEnd = new Date(oldEndDate),
        oldEstimate = new Date(oldEstimateDate),
        newEnd = new Date(newEndDate),
        newEstimate = new Date(newEstimateDate);
      throwIfMissing(
        [oldEnd, oldEstimate, newEnd, newEstimate].some((d) => isNaN(d.getTime())),
        'Định dạng ngày không hợp lệ',
      );
      throwIfMissing(newEnd < oldEnd, 'Ngày kết thúc mới không được nhỏ hơn ngày kết thúc cũ');
      throwIfMissing(
        newEstimate < oldEstimate,
        'Ngày ước tính mới không được nhỏ hơn ngày ước tính cũ',
      );
      throwIfMissing(
        newEnd < newEstimate,
        'Ngày kết thúc mới không được nhỏ hơn ngày ước tính mới',
      );
    }

    if (type === ProjectTaskProposalType.CHANGE_ASSIGNEE && newValue && oldValue) {
      const { oldUser, replacementUser } = newValue as ProjectTaskProposalChangeAssigneeValue;
      checkArray(oldUser, 'Thiếu thông tin người dùng cũ');
      checkArray(replacementUser, 'Thiếu thông tin người dùng thay thế');
      checkIds(oldUser, 'Thiếu id người dùng cũ');
      checkIds(replacementUser, 'Thiếu id người dùng thay thế');
    }

    if (type === ProjectTaskProposalType.CHANGE_ORG_UNIT && newValue && oldValue) {
      const { oldOrgUnit, newOrgUnit } = newValue as ProjectTaskProposalChangeOrgUnitValue;
      checkArray(oldOrgUnit, 'Thiếu thông tin đơn vị cũ');
      checkArray(newOrgUnit, 'Thiếu thông tin đơn vị mới');
      checkIds(oldOrgUnit, 'Thiếu id đơn vị cũ');
      checkIds(newOrgUnit, 'Thiếu id đơn vị mới');
    }
  }

  async getOrgUnitsByUserPermissions(user: UserRequest) {
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);

    if (isAdmin) return true;

    const orgUnitOfUser = await this.orgUnitRepo.findOne({
      where: {
        id: user.orgUnitId,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    if (orgUnitOfUser && orgUnitOfUser.type >= OrgUnitType.DIVISION) return false;

    return true;
  }
}
