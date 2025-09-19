import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrderType } from '@/common/enums/order-type.enum';
import { ChangeItem, JobApproverLogDto, JobLog } from '../entities/job-log.entity';
import { CreateJobLogDto } from '../dtos/create-job-log.dto';
import { Job } from '../entities/job.entity';
import { JobLogAction, JobLogType } from '../job.enum';
import { instanceToPlain } from 'class-transformer';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { JobTitle } from '@/modules/job-title/entities/job-title.entity';
import { Industry } from '@/modules/industry/entities/industry.entity';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class JobLogService {

  private fieldMap: Record<string, Repository<any>>;

  constructor(
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    
    @InjectRepository(OrgUnit)
    private orgUnitRepo: Repository<OrgUnit>,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,

    @InjectRepository(Industry)
    private industryRepo: Repository<Industry>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(JobLog)
    private  jobLogRepo: Repository<JobLog>,
  ) {
    this.fieldMap = {
      positionId: this.positionRepo,
      orgUnitId: this.orgUnitRepo,
      jobTitleId: this.jobTitleRepo,
      industryId: this.industryRepo,
      ownerId: this.userRepo,
    };
  }

  async createJobLog(
    createJobLogDto: CreateJobLogDto,
    user: UserRequest,
  ) {
    const { oldData, newData, type, jobId, action } = createJobLogDto;

    const valueChanges = this.diffJob(oldData, newData);
    const enrichedChanges = await this.enrichChangeItems(valueChanges);

    await this.jobLogRepo.save({
      type,
      action,
      jobId,
      oldValue: oldData,
      newValue: newData,
      changes: enrichedChanges,
      createdById: user.id,
    });
  }

  async createJobApproverLog(
    data: JobApproverLogDto,
    user: UserRequest,
    manager: EntityManager
  ) {

    const change: ChangeItem[] = [];

    if(data.reasonReject)
      change.push({
        field: 'reasonReject',
        from: null,
        to: data.reasonReject,
      });
    
    if (data.opinion)
      change.push({
        field: 'opinion',
        from: null,
        to: data.opinion,
      });

    await manager.insert(JobLog,{
      type: data.type,
      action: data.action,
      jobId: data.jobId,
      changes: change,
      createdById: user.id,
    });
  }

  async createManyJobLogs(
    jobs: Partial<Job>[],
    userId: string,
    type: JobLogType = JobLogType.JOB,
    manager: EntityManager
  ): Promise<void> {
    const logs = jobs.map((job) => (
    {
      type: type,
      action: JobLogAction.CREATE,
      jobId: job.id,
      oldValue: null,
      newValue: instanceToPlain(job),
      changes: [],
      createdById: userId,
    }));

    await manager.insert(JobLog, logs);
    
  }

  async createLogDeleteJobRecruitment(
    jobId: string,
    user: UserRequest,
    manager: EntityManager
  ){
    await manager.insert(JobLog,{
      type: JobLogType.JOB_RECRUITMENT,
      action: JobLogAction.DELETE,
      jobId,
      createdById: user.id,
    });
  }


  diffJob(oldJob: any, newJob: any): ChangeItem[] {

    if (!oldJob || !newJob) return [];
    
    const changes: ChangeItem[] = [];

    const ignoredKeys = ['updatedAt', 'createdAt', 'description', 'requirement', 'welfare' ];

    Object.keys(newJob).forEach((key) => {
      if (ignoredKeys.includes(key)) return;

      const oldValue = oldJob[key];
      const newValue = newJob[key];

      // So sánh Date
      if (oldValue instanceof Date || newValue instanceof Date) {

        const oldTime = new Date(oldValue).getTime();
        const newTime = new Date(newValue).getTime();
        if (oldTime !== newTime) {
          changes.push({ field: key, from: oldValue, to: newValue });
        }
        return;
      }

      // So sánh Array hoặc Object (deep)
      if (Array.isArray(oldValue) || typeof oldValue === 'object') {
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({ field: key, from: oldValue, to: newValue });
        }
        return;
      }

      // So sánh primitive
      if (oldValue !== newValue) {
        changes.push({ field: key, from: oldValue, to: newValue });
      }
    });

    return changes;
  }



  async enrichChangeItems(changes: ChangeItem[]): Promise<ChangeItem[]> {
    return Promise.all(
      changes.map(async (change) => {
        const repo = this.fieldMap[change.field];
        if (!repo) return change;

        const [fromEntity, toEntity] = await Promise.all([
          change.from ? repo.findOne({ where: { id: change.from } }) : null,
          repo.findOne({ where: { id: change.to } }),
        ]);

        return {
          ...change,
          from: fromEntity?.name || change.from,
          to: toEntity?.name || change.to,
        };
      }),
    );
  }
}
