import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectTask } from './entities/project-task.entity';
import { TreeRepository, LessThan, Between } from 'typeorm';
import { NotificationService } from '../notification/services/notification.service';
import { ProjectTaskType } from './project-task.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, MoreThan } from 'typeorm';
import { ProjectTaskNotificationHistory } from './entities/project-task-notification-history.entity';
import { OrderType } from '@/common/enums/order-type.enum';
import { NotificationType } from '../notification/notification.enum';

@Injectable()
export class ProjectTaskCron {
  constructor(
    @InjectRepository(ProjectTask)
    private readonly projectTaskRepo: TreeRepository<ProjectTask>,

    @InjectRepository(ProjectTaskNotificationHistory)
    private readonly progressNotificationHistoryRepo: Repository<ProjectTaskNotificationHistory>,

    private readonly notificationService: NotificationService,
  ) {}

  async getExpiringTasks(daysBefore = 1) {
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setDate(to.getDate() + daysBefore);
    to.setHours(23, 59, 59, 999);

    const tasks = await this.projectTaskRepo.find({
      where: [
        {
          progressPercent: LessThan(100),
          estimateDate: Between(from, to),
          type: ProjectTaskType.TASK,
        },
        {
          progressPercent: LessThan(100),
          endDate: Between(from, to),
          type: ProjectTaskType.TASK,
        },
      ],
      relations: ['projectTaskAssignees'],
      select: ['id', 'name', 'code', 'type', 'estimateDate', 'endDate', 'progressPercent'],
    });
    return tasks;
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleNotifyExpiringTasksCron() {
    const tasks = await this.getExpiringTasks(1);
    for (const task of tasks) {
      const userIds = Array.from(
        new Set((task.projectTaskAssignees || []).map((a) => a.userId).filter(Boolean)),
      );
      if (userIds.length === 0) continue;
      await this.notificationService.createManyNotification({
        notification: {
          title: 'Công việc sắp đến hạn',
          content: `Công việc "${task.name}" (mã: ${task.code}) đã đến deadline. Vui lòng kiểm tra và cập nhật tiến độ!`,
          type: NotificationType.TASK_EXPIRED,
          path: `/dashboard/project-task?projectTaskId=${task.id}`,
          userIds,
        },
        isPushFCM: true,
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleNotifyTasksBehindScheduleCron() {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    const tasks = await this.projectTaskRepo.find({
      where: {
        progressPercent: LessThan(100),
        endDate: MoreThan(now),
        type: ProjectTaskType.TASK,
        children: [],
      },
      relations: ['projectTaskAssignees'],
      select: ['id', 'name', 'code', 'type', 'endDate', 'startDate', 'progressPercent'],
    });

    for (const task of tasks) {
      if (!task.startDate || !task.endDate) continue;
      const totalDuration = task.endDate.getTime() - task.startDate.getTime();
      const elapsed = now.getTime() - task.startDate.getTime();
      let minExpectedProgress = 0;
      if (totalDuration > 0)
        minExpectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

      if (now > task.endDate) minExpectedProgress = 100;
      if (task.progressPercent >= minExpectedProgress) continue;

      const lastHistory = await this.progressNotificationHistoryRepo.findOne({
        where: { projectTaskId: task.id },
        order: { lastNotifiedAt: OrderType.DESC },
      });
      if (lastHistory && lastHistory.lastNotifiedAt > threeDaysAgo) continue;

      const userIds = Array.from(
        new Set((task.projectTaskAssignees || []).map((a) => a.userId).filter(Boolean)),
      );
      if (userIds.length === 0) continue;
      await this.notificationService.createManyNotification({
        notification: {
          title: 'Công việc chậm tiến độ',
          content: `Công việc "${task.name}" (mã: ${task.code}) đang chậm tiến độ. Vui lòng kiểm tra và cập nhật!`,
          type: NotificationType.TASK_BEHIND_SCHEDULE,
          path: `/dashboard/project-task?projectTaskId=${task.id}`,
          userIds,
        },
        isPushFCM: true,
      });
      if (lastHistory) {
        lastHistory.lastNotifiedAt = now;
        await this.progressNotificationHistoryRepo.save(lastHistory);
      } else {
        await this.progressNotificationHistoryRepo.save({
          projectTaskId: task.id,
          lastNotifiedAt: now,
        });
      }
    }
  }
}
