import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectTaskDependency } from '../entities/project-task-dependency.entity';
import { Repository, In, EntityManager } from 'typeorm';
import { ProjectTask } from '../entities/project-task.entity';
import { ProjectTaskHandle } from '../project-task.handle';
import { TimeService } from '@/common/services/time.service';

@Injectable()
export class ProjectTaskDependencyService {
  constructor(
    @InjectRepository(ProjectTaskDependency)
    private readonly projectTaskDependencyRepo: Repository<ProjectTaskDependency>,

    @InjectRepository(ProjectTask)
    private readonly projectTaskRepo: Repository<ProjectTask>,

    private readonly projectTaskHandle: ProjectTaskHandle,

    private readonly timeService: TimeService,
  ) {}

  async updateTimeForTask(
    task: ProjectTask,
    newStartDate: Date,
    newEndDate: Date,
    newEstimateDate: Date,
  ) {
    if (
      task.startDate?.getTime() !== newStartDate.getTime() ||
      (task.endDate && newEndDate && task.endDate.getTime() !== newEndDate.getTime()) ||
      (task.estimateDate &&
        newEstimateDate &&
        task.estimateDate.getTime() !== newEstimateDate.getTime())
    ) {
      await this.projectTaskRepo.update(
        { id: task.id },
        {
          startDate: newStartDate,
          endDate: newEndDate,
          estimateDate: newEstimateDate,
        },
      );
    }
  }

  async propagateTimeToDependents(
    taskId: string,
    newStartDate?: Date,
    visited = new Set<string>(),
  ) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const dependents = await this.projectTaskDependencyRepo.find({
      where: { dependsOnTaskId: taskId },
    });
    if (!dependents.length) return;

    const dependentIds = dependents.map((dep) => dep.projectTaskId);
    const [dependentTasks, allDependencies] = await Promise.all([
      this.projectTaskRepo.find({
        where: { id: In(dependentIds) },
        select: ['id', 'startDate', 'endDate', 'estimateDate'],
      }),
      this.projectTaskDependencyRepo.find({ where: { projectTaskId: In(dependentIds) } }),
    ]);

    const depMap = new Map<string, string[]>();
    for (const dep of allDependencies) {
      if (!depMap.has(dep.projectTaskId)) depMap.set(dep.projectTaskId, []);
      depMap.get(dep.projectTaskId)!.push(dep.dependsOnTaskId);
    }

    const dependentTaskEndDateMap = new Map<string, Date>();
    for (const t of dependentTasks) if (t.endDate) dependentTaskEndDateMap.set(t.id, t.endDate);

    const dependsOnTaskMap = new Map<string, Date>();
    for (const dep of allDependencies) {
      if (dep.dependsOnTaskId && dep.projectTaskId) {
        const endDate = dependentTaskEndDateMap.get(dep.dependsOnTaskId);
        if (endDate) dependsOnTaskMap.set(dep.dependsOnTaskId, endDate);
      }
    }

    const calcDuration = (start?: Date, end?: Date) =>
      start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const dependentTaskMap = new Map(dependentTasks.map((t) => [t.id, t]));

    for (const dep of dependents) {
      const task = dependentTaskMap.get(dep.projectTaskId);
      if (!task) continue;

      const dependencyIds = depMap.get(dep.projectTaskId) ?? [];
      let maxEndDate: Date | undefined;
      for (const id of dependencyIds) {
        const endDate = dependsOnTaskMap.get(id);
        if (endDate && (!maxEndDate || endDate > maxEndDate)) maxEndDate = endDate;
      }

      let nextStartDate: Date | null = null;
      if (newStartDate && dependencyIds.includes(taskId)) {
        nextStartDate = new Date(newStartDate);
      } else if (maxEndDate) nextStartDate = new Date(maxEndDate);

      if (nextStartDate) {
        const duration = calcDuration(task.startDate, task.endDate);
        const durationEstimate = calcDuration(task.startDate, task.estimateDate);

        const newEndDate =
          duration > 0 ? new Date(nextStartDate.getTime() + duration * 24 * 60 * 60 * 1000) : null;
        const newEstimateDate =
          durationEstimate > 0
            ? new Date(nextStartDate.getTime() + durationEstimate * 24 * 60 * 60 * 1000)
            : null;

        // Chỉ update nếu giá trị thay đổi
        await this.updateTimeForTask(task, nextStartDate, newEndDate, newEstimateDate);
        await this.propagateTimeToDependents(task.id, nextStartDate, visited);
      }
    }
  }

  async propagateTimeToDependentsWhenRemoveDependency(
    taskId: string,
    newStartDate: Date,
    visited = new Set<string>(),
    rootId?: string,
  ) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const dependents = await this.projectTaskDependencyRepo.find({
      where: { dependsOnTaskId: taskId },
      select: ['projectTaskId', 'dependsOnTaskId', 'offsetDays'],
    });
    if (!dependents.length) return;

    const dependentIds = dependents.map((dep) => dep.projectTaskId);
    const dependentTasks = await this.projectTaskRepo.find({
      where: { id: In(dependentIds) },
      select: ['id', 'startDate', 'endDate', 'estimateDate'],
    });

    const offsetMap = new Map<string, { offset: number; dependsOnTaskId: string }>();
    for (const dep of dependents) {
      offsetMap.set(dep.projectTaskId, {
        offset: dep.offsetDays ?? 0,
        dependsOnTaskId: dep.dependsOnTaskId,
      });
    }

    const calcDuration = (start?: Date, end?: Date) =>
      start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    for (const task of dependentTasks) {
      const depInfo = offsetMap.get(task.id);
      const offset = depInfo && depInfo.dependsOnTaskId !== (rootId ?? taskId) ? depInfo.offset : 0;

      const newTaskStart = new Date(newStartDate.getTime() + offset * 24 * 60 * 60 * 1000);
      const duration = calcDuration(task.startDate, task.endDate);
      const durationEstimate = calcDuration(task.startDate, task.estimateDate);

      const newTaskEnd =
        duration > 0 ? new Date(newTaskStart.getTime() + duration * 24 * 60 * 60 * 1000) : null;
      const newTaskEstimate =
        durationEstimate > 0
          ? new Date(newTaskStart.getTime() + durationEstimate * 24 * 60 * 60 * 1000)
          : null;

      // Chỉ update nếu giá trị thay đổi
      await this.updateTimeForTask(task, newTaskStart, newTaskEnd, newTaskEstimate);
      await this.propagateTimeToDependentsWhenRemoveDependency(
        task.id,
        newTaskEnd ?? newTaskStart,
        visited,
        rootId ?? taskId,
      );
    }
  }

  async updateProjectTaskDependency(
    projectTaskId: string,
    dependsOnTaskIds: string[],
    manager?: EntityManager,
  ) {
    const projectTaskRepo = manager ? manager.getRepository(ProjectTask) : this.projectTaskRepo;
    const projectTaskDependencyRepo = manager
      ? manager.getRepository(ProjectTaskDependency)
      : this.projectTaskDependencyRepo;

    const projectTask = await projectTaskRepo.findOne({
      where: { id: projectTaskId },
      select: ['id', 'startDate', 'name'],
    });
    this.projectTaskHandle.errorNotFoundEntityWithId(projectTask, 'ProjectTask', projectTaskId);

    await projectTaskDependencyRepo.delete({ projectTaskId });

    if (!dependsOnTaskIds || dependsOnTaskIds.length === 0) {
      if (projectTask.startDate) {
        await this.propagateTimeToDependentsWhenRemoveDependency(
          projectTaskId,
          projectTask.startDate,
          new Set(),
          projectTaskId,
        );
      }
      return [];
    }

    const dependsOnTasks = await projectTaskRepo.find({
      where: { id: In(dependsOnTaskIds) },
      select: ['id', 'endDate', 'name'],
    });

    for (const dependsOnTask of dependsOnTasks) {
      if (
        dependsOnTask.endDate &&
        projectTask.startDate &&
        dependsOnTask.endDate > projectTask.startDate
      ) {
        throw new BadRequestException(
          `Task ${projectTask.name} không thể phụ thuộc vào task ${dependsOnTask.name} vì task này kết thúc sau khi task chính bắt đầu.`,
        );
      }
    }

    const dependencies = dependsOnTaskIds.map((dependsOnTaskId) => {
      const dependency = new ProjectTaskDependency();
      dependency.projectTaskId = projectTaskId;
      dependency.dependsOnTaskId = dependsOnTaskId;

      const dependsOnTask = dependsOnTasks.find((t) => t.id === dependsOnTaskId);
      if (dependsOnTask?.endDate && projectTask.startDate) {
        dependency.offsetDays = Math.ceil(
          (projectTask.startDate.getTime() - dependsOnTask.endDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
      } else {
        dependency.offsetDays = 0;
      }

      return dependency;
    });

    const result = await projectTaskDependencyRepo.save(dependencies);

    await this.propagateTimeToDependents(projectTaskId);

    return result;
  }

  async checkDependencyTimeConstraint(
    projectTaskId: string | null,
    dependsOnTaskIds: string[],
    startDate?: Date,
  ) {
    if (!dependsOnTaskIds?.length) return;

    let taskStartDate = startDate ?? null;
    if (!taskStartDate && projectTaskId) {
      const projectTask = await this.projectTaskRepo.findOne({
        where: { id: projectTaskId },
        select: ['id', 'startDate'],
      });
      this.projectTaskHandle.errorNotFoundEntityWithId(projectTask, 'ProjectTask', projectTaskId);
      taskStartDate = projectTask?.startDate ?? null;
    }
    if (!taskStartDate) return;

    const dependsOnTasks = await this.projectTaskRepo.find({
      where: { id: In(dependsOnTaskIds) },
      select: ['id', 'endDate', 'name'],
    });

    for (const t of dependsOnTasks) {
      if (t.endDate && t.endDate > taskStartDate) {
        throw new BadRequestException(
          `Task không thể phụ thuộc vào "${t.name}" vì task này kết thúc vào ${this.timeService.formatDate(t.endDate)}, muộn hơn ngày bắt đầu ${this.timeService.formatDate(taskStartDate)}.`,
        );
      }
    }
  }

  async getDependenciesByProjectTaskId(projectTaskId: string) {
    return this.projectTaskDependencyRepo.find({
      where: { projectTaskId },
      relations: ['dependsOnTask'],
    });
  }

  async propagateTimeToParentsUpstream(
    taskId: string,
    newEndDate: Date,
    visited = new Set<string>(),
  ) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const dependencies = await this.projectTaskDependencyRepo.find({
      where: { projectTaskId: taskId },
    });
    if (!dependencies.length) return;

    const parentIds = dependencies.map((dep) => dep.dependsOnTaskId);
    const parentTasks = await this.projectTaskRepo.find({
      where: { id: In(parentIds) },
      select: ['id', 'startDate', 'endDate', 'estimateDate'],
    });

    const calcDuration = (start?: Date, end?: Date) =>
      start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    for (const parentTask of parentTasks) {
      if (!(parentTask.endDate && newEndDate >= parentTask.endDate)) continue;

      const parentDuration = calcDuration(parentTask.startDate, parentTask.endDate);
      const parentDurationEstimate = calcDuration(parentTask.startDate, parentTask.estimateDate);

      const newParentEndDate = new Date(newEndDate);
      newParentEndDate.setDate(newParentEndDate.getDate() - 1);

      const newParentStartDate =
        parentDuration > 0
          ? new Date(newParentEndDate.getTime() - parentDuration * 24 * 60 * 60 * 1000)
          : parentTask.startDate;

      const newParentEstimateDate =
        parentDurationEstimate > 0
          ? new Date(newParentStartDate!.getTime() + parentDurationEstimate * 24 * 60 * 60 * 1000)
          : null;

      await this.projectTaskRepo.update(
        { id: parentTask.id },
        {
          startDate: newParentStartDate,
          endDate: newParentEndDate,
          estimateDate: newParentEstimateDate,
        },
      );

      await this.propagateTimeToParentsUpstream(parentTask.id, newParentEndDate, visited);
      await this.propagateTimeToDependents(parentTask.id, newParentEndDate, visited);
    }
  }
}
