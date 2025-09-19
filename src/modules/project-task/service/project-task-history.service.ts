import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectTaskHistory } from '../entities/project-task-history.entity';
import { Repository } from 'typeorm';
import { CreateProjectTaskHistoryDto } from '../dtos/create-project-task-history.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrderType } from '@/common/enums/order-type.enum';

@Injectable()
export class ProjectTaskHistoryService {
  constructor(
    @InjectRepository(ProjectTaskHistory)
    private readonly projectTaskHistoryRepo: Repository<ProjectTaskHistory>,
  ) {}

  async createProjectTaskHistory(
    createProjectTaskHistoryDto: CreateProjectTaskHistoryDto,
    user: UserRequest,
  ) {
    const { oldData, newData, type, projectTaskId, action } = createProjectTaskHistoryDto;

    await this.projectTaskHistoryRepo.save({
      type,
      action,
      projectTaskId,
      oldValue: oldData,
      newValue: newData,
      changedFields: Object.keys(newData),
      createdById: user.id,
    });
  }

  async getListProjectTaskHistoryById(projectTaskId: string) {
    return this.projectTaskHistoryRepo.find({
      where: { projectTaskId },
      relations: ['createdBy'],
      order: { createdAt: OrderType.DESC },
      select: {
        id: true,
        type: true,
        action: true,
        oldValue: true,
        newValue: true,
        changedFields: true,
        createdAt: true,
        createdBy: {
          id: true,
          name: true,
          url: true,
        },
      },
    });
  }
}
