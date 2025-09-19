import { TreeRepository, In, EntityManager, IsNull, Not } from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectTaskAssignee } from '../entities/project-task-assignee.entity';
import { CreateProjectTaskAssigneeDto } from '../dtos/create-project-task-assignee.dto';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { ProjectTaskAssigneeType, ProjectTaskUpdateAssigneeType } from '../project-task.enum';
import { NotificationType } from '@/modules/notification/notification.enum';
import { UpdateProjectTaskAssigneeDto } from '../dtos/update-project-task-assignee.dto';
import { User } from '@/modules/user/entities/user.entity';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { ProjectTaskHandle } from '../project-task.handle';

@Injectable()
export class ProjectTaskAssigneeService {
  constructor(
    @InjectRepository(ProjectTaskAssignee)
    private readonly projectTaskAssigneeRepo: TreeRepository<ProjectTaskAssignee>,

    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: TreeRepository<OrgUnit>,

    private readonly projectTaskHandle: ProjectTaskHandle,
  ) {}

  async createProjectTaskAssignee(
    createProjectTaskAssigneeDto: CreateProjectTaskAssigneeDto,
    options?: {
      createdByUser?: { id: string; name: string };
      projectTaskName?: string;
      notificationService?: NotificationService;
      manager?: EntityManager;
    },
  ) {
    const today = new Date();
    const { orgUnitIds, userIds, projectTaskId } = createProjectTaskAssigneeDto;
    const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
    const uniqueOrgUnitIds = Array.from(new Set(orgUnitIds)).filter(Boolean);
    if (!uniqueUserIds.length && !uniqueOrgUnitIds.length)
      return { success: true, created: 0, userAssignees: 0, orgUnitAssignees: 0 };

    const orgUnitRepo = options?.manager?.getRepository(OrgUnit) || this.orgUnitRepo;
    const assigneeRepo =
      options?.manager?.getRepository(ProjectTaskAssignee) || this.projectTaskAssigneeRepo;
    const userRepo = options?.manager?.getRepository(User);

    const [users, orgUnits] = await Promise.all([
      uniqueUserIds.length
        ? userRepo.find({ where: { id: In(uniqueUserIds) }, select: { id: true, name: true } })
        : [],
      uniqueOrgUnitIds.length
        ? orgUnitRepo.find({
            where: { id: In(uniqueOrgUnitIds) },
            select: { id: true, type: true },
          })
        : [],
    ]);
    if (uniqueUserIds.length && users.length !== uniqueUserIds.length)
      throw new BadRequestException('Một hoặc nhiều người dùng không tồn tại');
    if (uniqueOrgUnitIds.length && orgUnits.length !== uniqueOrgUnitIds.length)
      throw new BadRequestException('Một hoặc nhiều đơn vị tổ chức không tồn tại');

    const userAssignees = uniqueUserIds.map((userId) => ({
      userId,
      orgUnitId: null,
      projectTaskId,
      type: ProjectTaskAssigneeType.USER,
      assignedAt: today,
    }));
    const orgUnitAssignees = orgUnits.map((orgUnit) => ({
      userId: null,
      orgUnitId: orgUnit.id,
      projectTaskId,
      type: orgUnit.type,
      assignedAt: today,
    }));
    const assignees = [...userAssignees, ...orgUnitAssignees];
    if (!assignees.length)
      return { success: true, created: 0, userAssignees: 0, orgUnitAssignees: 0 };

    const savedAssignees = await assigneeRepo.save(assignees);
    const managerOfOrgUnits = await this.projectTaskHandle.getManagerOfOrgUnits(uniqueOrgUnitIds);
    const userAssigneeIds = userAssignees.map((a) => a.userId);
    const notifyUserIds = Array.from(new Set([...userAssigneeIds, ...managerOfOrgUnits])).filter(
      (id) => id !== options?.createdByUser?.id,
    );
    if (notifyUserIds.length && options?.notificationService) {
      await options.notificationService.createManyNotification({
        notification: {
          title: 'Bạn được phân công vào công việc mới',
          content: `${options.createdByUser?.name} đã phân công bạn vào công việc: ${options.projectTaskName}`,
          type: NotificationType.PROJECT_TASK,
          path: `/dashboard/project-task?projectTaskId=${projectTaskId}`,
          createdById: options.createdByUser?.id,
          userIds: notifyUserIds,
        },
        isPushFCM: true,
        manager: options.manager,
      });
    }

    const managerNotifyIds = managerOfOrgUnits.filter(
      (id) => !userAssigneeIds.includes(id) && id !== options?.createdByUser?.id,
    );
    if (managerNotifyIds.length && options?.notificationService) {
      await options.notificationService.createManyNotification({
        notification: {
          title: 'Công việc mới được phân công',
          content: `${options.createdByUser?.name} đã chỉnh sửa phân công cho công việc: ${options.projectTaskName}`,
          type: NotificationType.PROJECT_TASK,
          path: `/dashboard/project-task?projectTaskId=${projectTaskId}`,
          createdById: options.createdByUser?.id,
          userIds: managerNotifyIds,
        },
        isPushFCM: true,
        manager: options.manager,
      });
    }

    return {
      success: true,
      created: savedAssignees.length,
      userAssignees: userAssignees.length,
      orgUnitAssignees: orgUnitAssignees.length,
    };
  }

  async updateProjectTaskAssignee(
    updateProjectTaskAssigneeDto: UpdateProjectTaskAssigneeDto,
    type: ProjectTaskUpdateAssigneeType,
    manager?: EntityManager,
    options?: {
      createdByUser?: { id: string; name: string };
      projectTaskName?: string;
      notificationService?: NotificationService;
    },
  ) {
    let { orgUnitIds, userIds, projectTaskId } = updateProjectTaskAssigneeDto;

    const repo = manager
      ? manager.getRepository(ProjectTaskAssignee)
      : this.projectTaskAssigneeRepo;
    const orgUnitRepo = manager ? manager.getRepository(OrgUnit) : this.orgUnitRepo;

    const current = await repo.find({
      where: {
        projectTaskId,
        unassignedAt: IsNull(),
      },
      select: {
        id: true,
        userId: true,
        orgUnitId: true,
        type: true,
      },
    });

    if (type === ProjectTaskUpdateAssigneeType.USER) {
      orgUnitIds = current
        .filter((a) => a.type !== ProjectTaskAssigneeType.USER)
        .map((a) => a.orgUnitId)
        .filter((id) => !!id);
    } else if (type === ProjectTaskUpdateAssigneeType.ORG_UNIT) {
      userIds = current
        .filter((a) => a.type === ProjectTaskAssigneeType.USER)
        .map((a) => a.userId)
        .filter((id) => !!id);
    }

    const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
    const uniqueOrgUnitIds = Array.from(new Set(orgUnitIds)).filter(Boolean);

    const orgUnits =
      uniqueOrgUnitIds.length > 0
        ? await orgUnitRepo.find({
            where: { id: In(uniqueOrgUnitIds) },
            select: { id: true, type: true },
          })
        : [];
    const users =
      uniqueUserIds.length > 0
        ? await repo.manager
            .getRepository(User)
            .find({ where: { id: In(uniqueUserIds) }, select: { id: true, name: true } })
        : [];

    if (uniqueUserIds.length > 0 && users.length !== uniqueUserIds.length)
      throw new BadRequestException('Một hoặc nhiều người dùng không tồn tại');

    if (uniqueOrgUnitIds.length > 0 && orgUnits.length !== uniqueOrgUnitIds.length)
      throw new BadRequestException('Một hoặc nhiều đơn vị tổ chức không tồn tại');

    const newAssigneeKeys = new Set<string>();

    for (const userId of uniqueUserIds) {
      if (userId && typeof userId === 'string')
        newAssigneeKeys.add(`${ProjectTaskAssigneeType.USER}|${userId}|null`);
    }

    for (const orgUnit of orgUnits) newAssigneeKeys.add(`${orgUnit.type}|null|${orgUnit.id}`);

    const currentAssigneeKeys = new Set(
      current.map((a) => `${a.type}|${a.userId ?? 'null'}|${a.orgUnitId ?? 'null'}`),
    );

    const toAdd = Array.from(newAssigneeKeys).filter((key) => !currentAssigneeKeys.has(key));
    const toUnassign = current.filter(
      (a) => !newAssigneeKeys.has(`${a.type}|${a.userId ?? 'null'}|${a.orgUnitId ?? 'null'}`),
    );

    if (toAdd.length === 0 && toUnassign.length === 0) return { success: true, changes: false };

    const addEntities = [];
    const reassignedIds = [];

    for (const key of toAdd) {
      const [type, userId, orgUnitId] = key.split('|');
      const old = await repo.findOne({
        where: {
          projectTaskId,
          userId: userId !== 'null' ? userId : null,
          orgUnitId: orgUnitId !== 'null' ? orgUnitId : null,
          type: Number(type),
          unassignedAt: Not(IsNull()),
        },
        select: { id: true },
      });
      if (old) {
        await repo.update({ id: old.id }, { unassignedAt: null, assignedAt: new Date() });
        reassignedIds.push(old.id);
      } else {
        addEntities.push({
          userId: userId !== 'null' ? userId : null,
          orgUnitId: orgUnitId !== 'null' ? orgUnitId : null,
          projectTaskId,
          type: Number(type),
          assignedAt: new Date(),
        });
      }
    }

    if (toUnassign.length > 0) {
      for (const a of toUnassign) {
        await repo.update({ id: a.id }, { unassignedAt: new Date() });
      }
    }

    if (addEntities.length > 0) {
      for (const entity of addEntities) {
        await repo.save(entity);
      }
    }

    let newUserIds: string[] = [];
    if (addEntities.length > 0) {
      newUserIds = addEntities
        .filter((entity) => entity.userId && entity.userId !== options?.createdByUser?.id)
        .map((entity) => entity.userId!)
        .filter((id): id is string => !!id);
    }
    if (reassignedIds.length > 0) {
      const reassigned = await repo.find({ where: { id: In(reassignedIds) } });
      newUserIds = newUserIds.concat(
        reassigned
          .filter((entity) => entity.userId && entity.userId !== options?.createdByUser?.id)
          .map((entity) => entity.userId!)
          .filter((id): id is string => !!id),
      );
    }

    newUserIds = Array.from(new Set(newUserIds)).filter((id) => id !== options?.createdByUser?.id);

    if (newUserIds.length > 0) {
      await options?.notificationService?.createManyNotification({
        notification: {
          title: 'Bạn được phân công vào công việc',
          content: `${options?.createdByUser?.name} đã phân công bạn vào công việc: ${options?.projectTaskName}`,
          type: NotificationType.PROJECT_TASK,
          path: `/dashboard/project-task?projectTaskId=${projectTaskId}`,
          createdById: options?.createdByUser?.id,
          userIds: newUserIds,
        },
        isPushFCM: true,
        manager,
      });
    }

    return {
      success: true,
      changes: true,
      added: addEntities.length + reassignedIds.length,
      removed: toUnassign.length,
    };
  }
}
