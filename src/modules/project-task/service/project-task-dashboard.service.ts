import { Injectable } from '@nestjs/common';
import { ProjectTaskHandle } from '../project-task.handle';
import { GetProjectTaskDashboardDto } from '../dtos/get-project-task-dashboard.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectTask } from '../entities/project-task.entity';
import { Between, FindOptionsWhere, In, IsNull, Not, Repository, TreeRepository } from 'typeorm';
import {
  ProjectTaskDisplayStatus,
  ProjectTaskGetInfoOption,
  ProjectTaskType,
} from '../project-task.enum';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { ProjectTaskAssignee } from '../entities/project-task-assignee.entity';
import { MAX_DATE, MIN_DATE, PROGRESS_COMPLETE } from '../project-task.constant';
import { GetListPercentAndUserImplementTaskDashboardDto } from '../dtos/get-list-percent-task-dashboard.dto';
import { GetListProjectByDivisionDto } from '../dtos/get-list-project-by-division.dto';
import { GetListTaskDetailOfProjectDashboardDto } from '../dtos/get-list-task-detail-dashboard.dto';
import { GetListTopUserAndDepartmentDashboardDto } from '../dtos/get-list-top-dashboard.dto';
import { TopUserDashboard } from '../interfaces/project-task-dashboard.interface';
import { UserType } from '@/modules/user/user.enum';
import { ProjectTaskReport } from '../entities/project-task-report.entity';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { ProjectTaskService } from './project-task.service';

@Injectable()
export class ProjectTaskDashboardService {
  constructor(
    @InjectRepository(ProjectTask)
    private readonly projectTaskRepo: TreeRepository<ProjectTask>,

    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,

    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: TreeRepository<OrgUnit>,

    @InjectRepository(ProjectTaskAssignee)
    private readonly projectTaskAssigneeRepo: Repository<ProjectTaskAssignee>,

    @InjectRepository(ProjectTaskReport)
    private readonly projectTaskReportRepo: Repository<ProjectTaskReport>,

    @InjectRepository(UserOrgUnitPosition)
    private readonly userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

    private readonly projectTaskHandle: ProjectTaskHandle,

    private readonly projectTaskService: ProjectTaskService,
  ) {}

  async getRootProjects(
    user: UserRequest,
    fromDate?: string,
    toDate?: string,
    divisionId?: string,
    projectTaskId?: string,
  ) {
    let where: FindOptionsWhere<ProjectTask>[];
    let projectIds: string[] | undefined;

    if (projectTaskId) {
      where = [{ parentId: projectTaskId }];
    } else {
      const base: FindOptionsWhere<ProjectTask> = {
        type: ProjectTaskType.PROJECT,
        parentId: IsNull(),
      };
      if (divisionId) {
        projectIds = await this.projectTaskHandle.getAllTopDescendantIdsByUserId(
          user.id,
          divisionId,
        );
        if (!projectIds.length) return [];
      }
      if (fromDate || toDate) {
        const startBetween = Between(
          fromDate ? new Date(fromDate) : new Date(MIN_DATE),
          toDate ? new Date(toDate) : new Date(MAX_DATE),
        );
        const endBetween = Between(
          fromDate ? new Date(fromDate) : new Date(MIN_DATE),
          toDate ? new Date(toDate) : new Date(MAX_DATE),
        );
        where = [
          { ...base, ...(projectIds ? { id: In(projectIds) } : {}), startDate: startBetween },
          { ...base, ...(projectIds ? { id: In(projectIds) } : {}), endDate: endBetween },
        ];
      } else {
        where = [{ ...base, ...(projectIds ? { id: In(projectIds) } : {}) }];
      }
    }

    return await this.projectTaskRepo.find({
      where,
      select: [
        'id',
        'name',
        'createdAt',
        'startDate',
        'endDate',
        'estimateDate',
        'progressPercent',
        'delayReasons',
        'type',
        'parentId',
        'budget',
        'isBudgetConfirmed',
        'childrenCount',
      ],
    });
  }

  async getTotalDirectTasks(projectTasks: ProjectTask[]) {
    const today = new Date();
    const allDescendants = await Promise.all(
      projectTasks.map((project) => this.projectTaskRepo.findDescendants(project)),
    );
    const allLeafTasks: ProjectTask[] = allDescendants
      .flat()
      .filter((t) => t.childrenCount === 0 && t.type === ProjectTaskType.TASK);

    let totalInProgressDirectTasks = 0;
    let totalCompletedDirectTasks = 0;
    let totalOverdueDirectTasks = 0;
    const projectTaskIdsInProgress: string[] = [];
    const projectTaskIdsCompleted: string[] = [];
    const projectTaskIdsOverdue: string[] = [];

    for (const task of allLeafTasks) {
      const displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(task, today);
      if (displayStatus === ProjectTaskDisplayStatus.IN_PROGRESS) {
        totalInProgressDirectTasks++;
        projectTaskIdsInProgress.push(task.id);
      } else if (displayStatus === ProjectTaskDisplayStatus.COMPLETED) {
        totalCompletedDirectTasks++;
        projectTaskIdsCompleted.push(task.id);
      } else if (displayStatus === ProjectTaskDisplayStatus.OVERDUE) {
        totalOverdueDirectTasks++;
        projectTaskIdsOverdue.push(task.id);
      } else if (displayStatus === ProjectTaskDisplayStatus.COMPLETED_LATE) {
        totalCompletedDirectTasks++;
        projectTaskIdsCompleted.push(task.id);
      }
    }

    return {
      totalInProgressDirectTasks,
      totalCompletedDirectTasks,
      totalOverdueDirectTasks,
      totalDirectTasks: allLeafTasks.length,
      projectTaskIdsInProgress,
      projectTaskIdsCompleted,
      projectTaskIdsOverdue,
    };
  }

  async calculateTaskOfProjects(projectTasks: ProjectTask[]) {
    const projectStats = [];
    const allDescendants = await Promise.all(
      projectTasks.map((project) => this.projectTaskRepo.findDescendants(project)),
    );
    for (let i = 0; i < projectTasks.length; i++) {
      const project = projectTasks[i];
      const descendants = allDescendants[i];
      const leafTasks = descendants.filter(
        (t) => t.childrenCount === 0 && t.type === ProjectTaskType.TASK,
      );
      const totalTasks = leafTasks.length;
      let progressPercent = 0;
      if (totalTasks > 0) {
        const totalProgress = leafTasks.reduce((sum, task) => {
          return sum + (task.progressPercent || 0);
        }, 0);
        progressPercent = Math.round((totalProgress / totalTasks) * 10) / 10;
      }
      projectStats.push({
        projectId: project.id,
        projectName: project.name,
        totalTasks,
        progressPercent,
      });
    }
    return projectStats;
  }

  async calculateStatusOfProjects(projectTasks: ProjectTask[]) {
    const today = new Date();

    let totalNotStarted = 0;
    let totalInProgress = 0;
    let totalCompleted = 0;
    let totalCompletedLate = 0;
    let totalOverdue = 0;

    for (const projectTask of projectTasks) {
      const displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(projectTask, today);

      switch (displayStatus) {
        case ProjectTaskDisplayStatus.NOT_STARTED:
          totalNotStarted++;
          break;
        case ProjectTaskDisplayStatus.IN_PROGRESS:
          totalInProgress++;
          break;
        case ProjectTaskDisplayStatus.COMPLETED:
          totalCompleted++;
          break;
        case ProjectTaskDisplayStatus.COMPLETED_LATE:
          totalCompletedLate++;
          break;
        case ProjectTaskDisplayStatus.OVERDUE:
          totalOverdue++;
          break;
      }
    }

    return {
      totalNotStarted,
      totalInProgress,
      totalCompleted,
      totalCompletedLate,
      totalOverdue,
    };
  }

  async calculatePercentBudgetOfProjects(projectTasks: ProjectTask[]) {
    let totalConfirmedBudget = 0,
      totalPlannedBudget = 0;

    for (const projectTask of projectTasks) {
      if (projectTask.type === ProjectTaskType.PROJECT && !projectTask.parentId) {
        if (projectTask.isBudgetConfirmed) {
          totalConfirmedBudget += projectTask.budget ? Number(projectTask.budget) : 0;
        } else totalPlannedBudget += projectTask.budget ? Number(projectTask.budget) : 0;
      }
    }

    totalPlannedBudget = totalPlannedBudget + totalConfirmedBudget;

    const budgetUsagePercent =
      totalPlannedBudget > 0 ? Math.round((totalConfirmedBudget / totalPlannedBudget) * 100) : 0;

    return {
      totalPlannedBudget,
      totalConfirmedBudget,
      budgetUsagePercent,
    };
  }

  calculateDelayReasonOfProjects(projectTasks: ProjectTask[]) {
    const delayReasons = projectTasks.reduce((acc, task) => {
      if (task.delayReasons && Array.isArray(task.delayReasons) && task.delayReasons.length > 0) {
        task.delayReasons.forEach((reason) => {
          if (reason && reason.trim()) {
            acc[reason] = (acc[reason] || 0) + 1;
          }
        });
      }
      return acc;
    }, {});

    return Object.entries(delayReasons).map(([name, total]) => ({ name, total }));
  }

  async getProjectTaskDashboardForCEO(
    user: UserRequest,
    fromDate: string,
    toDate: string,
    divisionId?: string,
    projectTaskId?: string,
  ) {
    const projects = await this.getRootProjects(user, fromDate, toDate, divisionId, projectTaskId);

    const projectStats = await this.calculateTaskOfProjects(projects);

    return {
      projectTaskRootIds: projects.map((p) => p.id),
      taskOfProject: projectStats,
    };
  }

  async getProjectTaskDashboardForDepartmentHead(
    user: UserRequest,
    fromDate: string,
    toDate: string,
    divisionId: string,
    projectTaskId?: string,
  ) {
    const projects = await this.getRootProjects(user, fromDate, toDate, divisionId, projectTaskId);

    const projectStats = await this.calculateTaskOfProjects(projects);

    const delayReasons = this.calculateDelayReasonOfProjects(projects);

    return {
      projectTaskRootIds: projects.map((p) => p.id),
      taskOfProject: projectStats,
      delayReasons,
    };
  }

  async getListTaskPercentAndUserImplementProjectTaskDashboard(
    getListPercentAndUserImplementTaskDashboardDto: GetListPercentAndUserImplementTaskDashboardDto,
  ) {
    const today = new Date();
    const { projectTaskIds } = getListPercentAndUserImplementTaskDashboardDto;

    const rootProjects = await this.projectTaskRepo.find({
      where: { parentId: In(projectTaskIds) },
      select: ['id', 'name', 'progressPercent', 'startDate', 'endDate', 'estimateDate'],
    });

    const projectTaskStats = [];
    const userStatsMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        inProgress: number;
        completed: number;
        completedLate: number;
        overdue: number;
        totalTasks: number;
        notStarted: number;
        taskIds: string[];
      }
    >();

    for (const project of rootProjects) {
      const descendants = await this.projectTaskRepo.findDescendants(project);
      const leafTasks = descendants.filter(
        (task) => task.childrenCount === 0 && task.type === ProjectTaskType.TASK,
      );

      const leafTaskIds = leafTasks.map((t) => t.id);

      const totalProgress = leafTasks.reduce((sum, task) => sum + (task.progressPercent || 0), 0);
      const avgProjectProgress =
        leafTasks.length > 0 ? Math.round((totalProgress / leafTasks.length) * 10) / 10 : 0;

      const projectStat = {
        projectId: project.id,
        projectName: project.name,
        progressPercent: avgProjectProgress,
        totalTasks: leafTasks.length,
      };

      const assignees =
        leafTaskIds.length > 0
          ? await this.projectTaskAssigneeRepo.find({
              where: {
                projectTaskId: In(leafTaskIds),
                unassignedAt: IsNull(),
              },
              relations: ['user', 'projectTask'],
            })
          : [];

      assignees.forEach((assignee) => {
        if (assignee.userId && assignee.user && assignee.projectTask) {
          const userId = assignee.userId;
          const userName = assignee.user.name || assignee.user.email || 'Unknown';

          if (!userStatsMap.has(userId)) {
            userStatsMap.set(userId, {
              userId,
              userName,
              inProgress: 0,
              completed: 0,
              completedLate: 0,
              overdue: 0,
              totalTasks: 0,
              notStarted: 0,
              taskIds: [],
            });
          }
          const userStatsSum = userStatsMap.get(userId)!;

          userStatsSum.totalTasks++;
          userStatsSum.taskIds.push(assignee.projectTask.id);

          const status = this.projectTaskHandle.calculateTaskDisplayStatus(
            assignee.projectTask,
            today,
          );
          switch (status) {
            case ProjectTaskDisplayStatus.NOT_STARTED:
              userStatsSum.notStarted++;
              break;
            case ProjectTaskDisplayStatus.IN_PROGRESS:
              userStatsSum.inProgress++;
              break;
            case ProjectTaskDisplayStatus.COMPLETED:
              userStatsSum.completed++;
              break;
            case ProjectTaskDisplayStatus.COMPLETED_LATE:
              userStatsSum.completedLate++;
              break;
            case ProjectTaskDisplayStatus.OVERDUE:
              userStatsSum.overdue++;
              break;
          }
        }
      });
      projectTaskStats.push(projectStat);
    }

    return {
      totalProjects: rootProjects.length,
      projects: projectTaskStats,
      userStats: Array.from(userStatsMap.values()).sort((a, b) => b.totalTasks - a.totalTasks),
    };
  }

  async getListProjectTaskDashboardByDivision(
    getListProjectByDivisionDto: GetListProjectByDivisionDto,
    user: UserRequest,
  ) {
    const { divisionId } = getListProjectByDivisionDto;
    const { positionId, orgUnitId } = user;
    if (!positionId || !orgUnitId) return {};

    const [userPosition, userDivision] = await Promise.all([
      this.positionRepo.findOne({ where: { id: positionId } }),
      this.orgUnitRepo.findOne({
        where: { id: orgUnitId },
      }),
    ]);
    const isCEO = userPosition?.parentId === null;

    const projects = await this.getRootProjects(
      user,
      null,
      null,
      isCEO ? divisionId : userDivision.id,
      null,
    );

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }

  async getProjectTaskDashboardSummary(
    getProjectTaskDashboardDto: GetProjectTaskDashboardDto,
    user: UserRequest,
  ) {
    const today = new Date();
    const { positionId, orgUnitId } = user;
    const { fromDate, toDate, divisionId, projectTaskId } = getProjectTaskDashboardDto;
    if (!positionId || !orgUnitId) return {};

    const [userPosition, userDivision] = await Promise.all([
      this.positionRepo.findOne({ where: { id: positionId } }),
      this.orgUnitRepo.findOne({
        where: { id: orgUnitId },
      }),
    ]);

    const summary = {
      totalAllProjectTasks: 0,
      totalInProgressDirectTasks: 0,
      totalCompletedDirectTasks: 0,
      totalOverdueDirectTasks: 0,
      totalDirectTasks: 0,
    };

    if (!(userPosition?.parentId === null || (userDivision && userDivision.managerId === user.id)))
      return summary;

    const isCEO = userPosition?.parentId === null;
    const rootProjects = await this.getRootProjects(
      user,
      fromDate,
      toDate,
      isCEO ? divisionId : userDivision.id,
      projectTaskId,
    );

    let delayReasons = [];
    let leafTasks: ProjectTask[] = [];
    let budgetOfProject = {};

    if (projectTaskId) {
      const projectParent = await this.projectTaskRepo.findOne({
        where: { id: projectTaskId, type: ProjectTaskType.PROJECT },
      });
      delayReasons = this.calculateDelayReasonOfProjects(
        projectParent ? [projectParent] : rootProjects,
      );
      if (projectParent) {
        const descendants = await this.projectTaskRepo.findDescendants(projectParent);
        leafTasks = descendants.filter(
          (task) => task.childrenCount === 0 && task.type === ProjectTaskType.TASK,
        );
        budgetOfProject = await this.calculatePercentBudgetOfProjects([projectParent]);
      }
    } else {
      delayReasons = this.calculateDelayReasonOfProjects(rootProjects);
      leafTasks = rootProjects;
      budgetOfProject = await this.calculatePercentBudgetOfProjects(leafTasks);
    }

    if (!leafTasks.length) {
      return {
        totalAllProjectTasks: projectTaskId ? 1 : rootProjects.length,
        ...summary,
        delayReasons,
        statusOfProject: {
          total: rootProjects.length,
          totalNotStarted: 0,
          totalInProgress: 0,
          totalCompleted: 0,
          totalCompletedLate: 0,
          totalOverdue: 0,
          projectTaskIdsInProgress: [],
          projectTaskIdsCompleted: [],
          projectTaskIdsOverdue: [],
          projectTaskIdsNotStarted: [],
          projectTaskIdsCompletedLate: [],
        },
        budgetOfProject,
      };
    }

    const statusCounters = {
      totalNotStarted: 0,
      totalInProgress: 0,
      totalCompleted: 0,
      totalCompletedLate: 0,
      totalOverdue: 0,
      projectTaskIdsInProgress: [],
      projectTaskIdsCompleted: [],
      projectTaskIdsOverdue: [],
      projectTaskIdsNotStarted: [],
      projectTaskIdsCompletedLate: [],
    };

    for (const task of leafTasks) {
      const displayStatus = this.projectTaskHandle.calculateTaskDisplayStatus(task, today);
      switch (displayStatus) {
        case ProjectTaskDisplayStatus.IN_PROGRESS:
          statusCounters.totalInProgress++;
          statusCounters.projectTaskIdsInProgress.push(task.id);
          break;
        case ProjectTaskDisplayStatus.COMPLETED:
          statusCounters.totalCompleted++;
          statusCounters.projectTaskIdsCompleted.push(task.id);
          break;
        case ProjectTaskDisplayStatus.OVERDUE:
          statusCounters.totalOverdue++;
          statusCounters.projectTaskIdsOverdue.push(task.id);
          break;
        case ProjectTaskDisplayStatus.NOT_STARTED:
          statusCounters.totalNotStarted++;
          statusCounters.projectTaskIdsNotStarted.push(task.id);
          break;
        case ProjectTaskDisplayStatus.COMPLETED_LATE:
          statusCounters.totalCompletedLate++;
          statusCounters.projectTaskIdsCompletedLate.push(task.id);
          break;
      }
    }

    const directTasks = await this.getTotalDirectTasks(leafTasks);

    return {
      totalAllProjectTasks: projectTaskId ? 1 : rootProjects.length,
      ...directTasks,
      delayReasons,
      statusOfProject: {
        total: rootProjects.length,
        ...statusCounters,
      },
      budgetOfProject,
    };
  }

  async getProjectTaskDashboard(
    getProjectTaskDashboardDto: GetProjectTaskDashboardDto,
    user: UserRequest,
  ) {
    const { positionId, orgUnitId } = user;
    const { fromDate, toDate, divisionId, projectTaskId } = getProjectTaskDashboardDto;

    if (!positionId || !orgUnitId) return {};

    const [userPosition, userDivision] = await Promise.all([
      this.positionRepo.findOne({ where: { id: positionId } }),
      this.orgUnitRepo.findOne({
        where: { id: orgUnitId },
      }),
    ]);

    if (![UserType.ADMIN, UserType.ROOT].includes(user.type)) {
      if (userPosition?.parentId === null)
        return this.getProjectTaskDashboardForCEO(
          user,
          fromDate,
          toDate,
          divisionId,
          projectTaskId,
        );

      if (userDivision && userDivision.managerId === user.id)
        return this.getProjectTaskDashboardForDepartmentHead(
          user,
          fromDate,
          toDate,
          userDivision.id,
          projectTaskId,
        );

      return {};
    } else
      return this.getProjectTaskDashboardForCEO(user, fromDate, toDate, divisionId, projectTaskId);
  }

  async getListTaskDetailOfProject(
    getListTaskDetailOfProjectDashboardDto: GetListTaskDetailOfProjectDashboardDto,
    user: UserRequest,
  ) {
    const today = new Date();
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const { search, projectTaskIds, fromDate, toDate } = getListTaskDetailOfProjectDashboardDto;

    // 1. Build where conditions
    const whereItem = await this.projectTaskService.buildWhereConditions({
      divisionId: null,
      projectTaskIds,
      fromDate,
      toDate,
      isAdmin,
      user,
    });

    if (!whereItem) return [];

    // 2. Fetch base tasks with search
    const tasks = await this.projectTaskService.fetchBaseTasks(whereItem, search);
    if (!tasks.length) return [];

    // 3. Build complete task hierarchy
    const allTasks = await this.projectTaskService.buildCompleteTaskHierarchy(tasks);

    // 4. Fetch and organize related data in parallel
    const [dependencies, assignees] = await this.projectTaskService.fetchRelatedData(allTasks);

    // 5. Build enriched tree structure
    const enrichedTree = await this.projectTaskService.buildEnrichedTree({
      allTasks,
      dependencies,
      assignees,
      user,
      isAdmin,
      today,
    });

    // 6. Apply filters and get root projects
    const rootProjects = this.projectTaskService.filterAndGetRootProjects(enrichedTree, null);

    if (!rootProjects.length) return [];

    return rootProjects;
  }

  async getListTopUsersAndDepartments(
    getListTopUserAndDepartmentDashboardDto: GetListTopUserAndDepartmentDashboardDto,
    user: UserRequest,
  ) {
    const { fromDate, toDate, take, projectTaskId, divisionId } =
      getListTopUserAndDepartmentDashboardDto;
    const { positionId, orgUnitId } = user;
    if (!positionId || !orgUnitId) return { topDepartments: [], topUsers: [] };

    const [userPosition, userDivision] = await Promise.all([
      this.positionRepo.findOne({ where: { id: positionId } }),
      this.orgUnitRepo.findOne({ where: { id: orgUnitId } }),
    ]);

    let userOfDivisions: Set<string> = new Set();
    let projects: ProjectTask[] = [];
    if (!userPosition?.parentId) {
      projects = await this.getRootProjects(user, fromDate, toDate, divisionId, projectTaskId);
    } else if (userDivision && userDivision.managerId === user.id) {
      const allChildren = await this.orgUnitRepo.findDescendants(userDivision);
      const userOrgUnits = await this.userOrgUnitPositionRepo.find({
        where: { orgUnitId: In([userDivision.id, ...allChildren.map((c) => c.id)]) },
      });
      userOfDivisions = new Set(userOrgUnits.map((u) => u.userId));
      projects = await this.getRootProjects(user, fromDate, toDate, userDivision.id, projectTaskId);
    }

    if (!projects.length) return { topDepartments: [], topUsers: [] };

    // Fetch all leaf tasks in one go
    const allDescendants = await Promise.all(
      projects.map((project) => this.projectTaskRepo.findDescendants(project)),
    );
    const allLeafTasks: ProjectTask[] = allDescendants
      .flat()
      .filter((t) => t.childrenCount === 0 && t.type === ProjectTaskType.TASK);
    const taskMap = new Map(allLeafTasks.map((t) => [t.id, t]));

    // Batch fetch assignees
    const leafTaskIds = allLeafTasks.map((t) => t.id);
    const [assigneesDept, assigneesUser] = await Promise.all([
      this.projectTaskAssigneeRepo.find({
        relations: ['orgUnit', 'projectTask'],
        where: {
          projectTaskId: In(leafTaskIds),
          orgUnitId: Not(IsNull()),
          unassignedAt: IsNull(),
          userId: IsNull(),
        },
      }),
      this.projectTaskAssigneeRepo.find({
        relations: ['user', 'projectTask'],
        where: {
          userId: Not(IsNull()),
          projectTaskId: In(leafTaskIds),
          unassignedAt: IsNull(),
          orgUnitId: IsNull(),
        },
      }),
    ]);

    // Prepare division mapping
    const allOrgUnitIds = Array.from(
      new Set(assigneesDept.map((a) => a.orgUnitId).filter(Boolean)),
    );
    const orgUnitToDivision = await this.projectTaskHandle.getInfoDivisionAndDepartmentFromOrgUnits(
      allOrgUnitIds,
      ProjectTaskGetInfoOption.DIVISION,
    );

    // Prepare report mapping
    const allTaskIds = Array.from(
      new Set([...assigneesDept, ...assigneesUser].map((a) => a.projectTaskId)),
    );
    const allReports = await this.projectTaskReportRepo.find({
      where: { projectTaskId: In(allTaskIds), progressPercent: PROGRESS_COMPLETE },
      select: ['projectTaskId', 'createdAt'],
    });
    const reportMap = new Map<string, Date>();
    for (const r of allReports) {
      const prev = reportMap.get(r.projectTaskId);
      if (!prev || new Date(r.createdAt) > new Date(prev))
        reportMap.set(r.projectTaskId, r.createdAt);
    }

    // Aggregate department stats
    const divisionMap = new Map<string, any>();
    for (const a of assigneesDept) {
      if (!a.orgUnitId || !a.orgUnit) continue;
      const div = orgUnitToDivision.find((d) => d.id === a.orgUnitId);
      if (div && div.id) {
        if (!divisionMap.has(div.id)) {
          divisionMap.set(div.id, {
            orgUnitId: div.id,
            orgUnitName: div.name,
            totalTask: 0,
            doneTask: 0,
            taskIds: [],
          });
        }
        const agg = divisionMap.get(div.id);
        agg.totalTask++;
        if (a.projectTask.progressPercent === PROGRESS_COMPLETE) agg.doneTask++;
        agg.taskIds.push(a.projectTask.id);
      }
    }

    const today = new Date();
    let topDepartments = Array.from(divisionMap.values())
      .map((dep) => {
        const sum = dep.taskIds.reduce((acc, id) => {
          const task = taskMap.get(id);
          return task
            ? acc +
                (task.progressPercent || 0) *
                  this.projectTaskHandle.getTimeCoefficient(task, reportMap, today)
            : acc;
        }, 0);
        const performance = dep.taskIds.length ? sum / dep.taskIds.length : 0;
        return {
          orgUnitId: dep.orgUnitId,
          orgUnitName: dep.orgUnitName,
          totalTask: dep.totalTask,
          doneTask: dep.doneTask,
          totalScore: Number(performance.toFixed(1)),
          taskIds: dep.taskIds,
        };
      })
      .filter((dep) => dep.totalScore > 0)
      .sort(
        (a, b) =>
          b.totalScore - a.totalScore || b.doneTask - a.doneTask || b.totalTask - a.totalTask,
      );

    // Aggregate user stats
    const userMap = new Map<string, any>();
    for (const a of assigneesUser) {
      if (!a.userId || !a.user) continue;
      if (!userMap.has(a.userId)) {
        userMap.set(a.userId, {
          userId: a.userId,
          userName: a.user.name,
          userAvatar: a.user.url,
          totalTask: 0,
          doneTask: 0,
          taskIds: [],
        });
      }
      const userStats = userMap.get(a.userId);
      userStats.totalTask++;
      if (a.projectTask.progressPercent === PROGRESS_COMPLETE) userStats.doneTask++;
      userStats.taskIds.push(a.projectTask.id);
    }

    let topUsers: TopUserDashboard[] = Array.from(userMap.values())
      .map((user) => {
        const sum = user.taskIds.reduce((acc, id) => {
          const task = taskMap.get(id);
          return task
            ? acc +
                (task.progressPercent || 0) *
                  this.projectTaskHandle.getTimeCoefficient(task, reportMap, today)
            : acc;
        }, 0);
        const performance = user.taskIds.length ? sum / user.taskIds.length : 0;
        return {
          userId: user.userId,
          userName: user.userName,
          userAvatar: user.userAvatar,
          totalTask: user.totalTask,
          doneTask: user.doneTask,
          avgProgress: 0,
          totalScore: Number(performance.toFixed(1)),
          taskIds: user.taskIds,
        };
      })
      .filter((user) => user.totalScore > 0)
      .filter((user) => userOfDivisions.size === 0 || userOfDivisions.has(user.userId))
      .sort(
        (a, b) =>
          b.totalScore - a.totalScore || b.doneTask - a.doneTask || b.totalTask - a.totalTask,
      );

    if (take && take > 0) {
      topDepartments = topDepartments.slice(0, take);
      topUsers = topUsers.slice(0, take);
    }
    return { topDepartments, topUsers };
  }
}
