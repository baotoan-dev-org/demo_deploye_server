import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Equal, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { JobHandle } from '../job.handle';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from '../entities/job.entity';
import { CreateJobRecruitmentDto, CreateManyJobRecruitmentDto } from '../dtos/create-job-recruitment.dto';
import { QueryService } from '@/common/services/query.service';
import { UpdateJobRecruitmentDto } from '../dtos/update-job-recruitment.dto';
import { v4 as uuidv4 } from 'uuid';
import { JobApprover } from '../entities/job-approver.entity';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationType } from '@/modules/notification/notification.enum';
import { JobApproverStatus, JobLogAction, JobLogType, JobPriority, JobStatus, JobTag } from '../job.enum';
import { GetListJobRecruitmentDto } from '../dtos/get-list-job-recruitment.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetListNeedApproveByUserDto } from '../dtos/get-list-need-approve-by-user.dto';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { User } from '@/modules/user/entities/user.entity';
import { JobTitle } from '@/modules/job-title/entities/job-title.entity';
import { OrgUnitService } from '@/modules/org-unit/services/org-unit.service';
import { Position } from '@/modules/position/entities/position.entity';
import { JobRequestGroup } from '../entities/job-request-group.entity';
import { ApproveJobRecruitmentDto, ApproveMultipleGroupRequestDto, ApproveMultipleJobRecruitmentDto } from '../dtos/approve-job-recruitment.dto';
import { UserType } from '@/modules/user/user.enum';
import { JobLogService } from './job-log.service';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { CreateJobLogDto } from '../dtos/create-job-log.dto';
import { JobApproverLogDto, JobLog } from '../entities/job-log.entity';
import { GetListDeleteJobRecruitmentDto } from '../dtos/get-list-delete-job-cruitment.dto';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { JobTitleService } from '@/modules/job-title/services/job-title.service';
import { NeedApproveDto } from '../dtos/need-approve.dto';

@Injectable()
export class JobRecruitmentService {
  constructor(
    private dataSource: DataSource,

    private jobHandle: JobHandle,

    private queryService: QueryService,

    private notificationService: NotificationService,

    private orgUnitService: OrgUnitService,

    private jobLogService: JobLogService,

    private jobTitleService: JobTitleService,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(JobApprover)
    private jobApproverRepo: Repository<JobApprover>,

    @InjectRepository(Position)
    private positionRepo: Repository<Position>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,    
        
    @InjectRepository(JobRequestGroup)
    private jobRequestGroupRepo: Repository<JobRequestGroup>,

    @InjectRepository(JobLog)
    private jobLogRepo: Repository<JobLog>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

    @InjectRepository(OrgUnit)
    private orgUnitRepo: Repository<OrgUnit>
  ) {}

  async createJobRecruitment(createJobRecruitmentDto: CreateJobRecruitmentDto, user: UserRequest) {
    const { orgUnitId, positionId, jobTitleId } = createJobRecruitmentDto;

    const conflictJobDb = await this.jobRepo.exists({
      where: {
        jobTitleId,
        orgUnitId,
        positionId,
        status: Not(In([JobStatus.COMPLETED, JobStatus.REJECTED])),
      },
    });

    if (conflictJobDb)
      throw new ConflictException('Tồn tại yêu cầu tuyển dụng chưa được xử lí xong!');

    await this.jobHandle.errorOgrUnitIndustryPosition(createJobRecruitmentDto, user);
    const jobName = await this.jobTitleRepo.findOne({
      where: {id: jobTitleId},
      select: ['id','name']
    })
    if(!jobName) throw new NotFoundException("Chức danh tuyển dụng không tồn tại!")

    const jobInsert: Partial<Job> = {
      ...createJobRecruitmentDto,
      name: jobName.name,
      id: uuidv4(),
      createdById: user.id,
    };
    
    // check xem phải TGĐ tạo yêu cầu không

    const isGeneralDirector = await this.positionRepo.exists({
      where: { id: user.positionId, name: 'Tổng giám đốc'}
    })

    let jobApproversInsert: Partial<JobApprover>[] = [];

    let managerIds: string[] = [];

    if (!isGeneralDirector) {      
      // lấy các quản lý, bỏ người tạo
      managerIds = (await this.jobHandle.getManagerIdsOrgUnit(orgUnitId)).filter((e) => e !== user.id);
  
      // tìm GĐ khối nhân sự, nếu k có thì tìm trưởng phòng nhân sự
  
      const hrManagerId = await this.jobHandle.getHrManagerId();
  
      if (hrManagerId && hrManagerId !== user.id) managerIds.push(hrManagerId);
  
      jobApproversInsert = managerIds.map((managerId) => ({
        id: uuidv4(),
        jobId: jobInsert.id,
        approverId: managerId,
        createdById: user.id,
      }));
    }

    return await this.dataSource
      .transaction(async (manager) => {

        const isAutoApproved = jobApproversInsert.length === 0;

        if (isAutoApproved) {
          jobInsert.status = JobStatus.APPROVED;
          // Noti cho HR
        }

        await manager.insert(Job, jobInsert);

        if(!isAutoApproved){
          await manager.insert(JobApprover, jobApproversInsert);
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Yêu cầu tuyển dụng',
              content: 'Có yêu cầu tuyển dụng mới cần phê duyệt.',
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/proposals-job-recruitment', // path đi vào phần phê duyệt,
              createdById: user.id,
              userIds: managerIds,
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


  async createManyJobRecruitment(createManyJobRecruitmentDto: CreateManyJobRecruitmentDto, user: UserRequest) {

    // return 200;
    const { data } = createManyJobRecruitmentDto;

    if (!data.length) throw new BadRequestException('Danh sách job trống');

    const positionIds = data.map(item => item.positionId);

    const jobTitleIds = data.map(i => i.jobTitleId);
    const [jobTitles, positions ] = await Promise.all([
      this.jobTitleRepo.findBy({
        id: In(jobTitleIds),
      }),
      this.positionRepo.find({
        where: { id: In(positionIds) },
        relations: ['salaryRangePositions', 'salaryRangePositions.salaryRange'],
      })
      
    ]) 
    const jobTitleMap = new Map(jobTitles.map(j => [j.id, j.name]));

    const positionSalaryMap = new Map<string, { minSalary: number; maxSalary: number }>();

    for (const pos of positions) {
      const salaryRange = pos.salaryRangePositions?.[0]?.salaryRange;
      if (salaryRange) {
        positionSalaryMap.set(pos.id, {
          minSalary: salaryRange.minSalary,
          maxSalary: salaryRange.maxSalary,
        });
      }
    }

    const allErrors  = [];

    for (const [index, item] of data.entries()) {
      const itemErrors = await this.jobHandle.validateRecruitmentItem(item, user, jobTitleMap);

      if (itemErrors.length) {
        allErrors.push({
          index: index + 1,
          message: `Yêu cầu tuyển dụng thứ ${index + 1} không hợp lệ`,
          errors: itemErrors,
        });
      }
    }


    if (allErrors.length > 0) {
      throw new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        errors: allErrors,
      });
    }

    const jobRequestGroupInsert: Partial<JobRequestGroup> = {
      id: uuidv4(),
      createdById: user.id,
    };
    
    // check xem phải TGĐ tạo yêu cầu không
    const isGeneralDirector = user.positionId ?  await this.positionRepo.exists({
      where: { id: user.positionId, name: 'Tổng giám đốc'}
    }) : null;

    // let jobApproversInsert: Partial<JobApprover>[] = [];

    let managerIds: string[] = [];

    if (!isGeneralDirector) {      

      // lấy các quản lý, bỏ người tạo
      managerIds = (await this.jobHandle.getManagerIdsOrgUnit(data[0].orgUnitId)).filter((e) => e !== user.id);
  
      // tìm GĐ khối nhân sự, nếu k có thì tìm trưởng phòng nhân sự
  
      const hrManagerId = await this.jobHandle.getHrManagerId();
  
      if (hrManagerId && hrManagerId !== user.id) managerIds.push(hrManagerId);
  
    }

    const isAutoApproved = isGeneralDirector || managerIds.length === 0;

    const status = isAutoApproved ? JobStatus.APPROVED : JobStatus.PENDING;

    const jobInsert: Partial<Job>[] = data.map((item) => {
      const salary = positionSalaryMap.get(item.positionId);

      return { 
        ...item,
        id: uuidv4(),
        name: jobTitleMap.get(item.jobTitleId),
        createdById: user.id,
        requestGroupId: jobRequestGroupInsert.id,
        status: status,
        tag: item.priority === JobPriority.URGENT ? JobTag.HOT : JobTag.NEW,
        minExpectedSalary: salary?.minSalary ?? 0,
        maxExpectedSalary: salary?.maxSalary ?? 0,
        minSalary: salary?.minSalary ?? 0,
        maxSalary: salary?.maxSalary ?? 0
      }
    })

    const jobApproversInsert: Partial<JobApprover>[] = jobInsert.flatMap((job) =>
      managerIds.map((managerId) => ({
        id: uuidv4(),
        jobId: job.id,                       
        requestGroupId: jobRequestGroupInsert.id,
        approverId: managerId,
        createdById: user.id,
      }))
    );


    return await this.dataSource
      .transaction(async (manager) => {

        await manager.insert(JobRequestGroup, jobRequestGroupInsert);

        await manager.insert(Job, jobInsert);


        await this.jobLogService.createManyJobLogs(jobInsert, user.id, JobLogType.JOB_RECRUITMENT, manager);


        if(!isAutoApproved){
          await manager.insert(JobApprover, jobApproversInsert);
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Yêu cầu tuyển dụng',
              content: 'Có yêu cầu tuyển dụng mới cần phê duyệt.',
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/proposals-job-recruitment', // path đi vào phần phê duyệt,
              createdById: user.id,
              userIds: managerIds,
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

  async updateJobRecruitment(
    id: string,
    updateJobRecruitmentDto: UpdateJobRecruitmentDto,
    user: UserRequest,
  ) {
    const { orgUnitId, positionId, jobTitleId } = updateJobRecruitmentDto;
    const [jobDb, conflictJobDb] = await Promise.all([
      this.jobRepo.findOne({ where: { id } }),
      this.jobRepo.exists({
        where: {
          id: Not(Equal(id)),
          jobTitleId,
          orgUnitId,
          positionId,
          status: Not(In([JobStatus.COMPLETED, JobStatus.REJECTED])),
        },
      }),
    ]);

    this.jobHandle.errorNotFoundConflict(jobDb, conflictJobDb, user);

    await this.jobHandle.errorOgrUnitIndustryPosition(updateJobRecruitmentDto, user);

    let jobLog: CreateJobLogDto = {
      oldData: undefined,
      newData: undefined,
      type: JobLogType.JOB_RECRUITMENT,
      action: JobLogAction.CREATE,
      jobId: ''
    };

    const fieldsToCompare: (keyof typeof updateJobRecruitmentDto)[] = [
      'orgUnitId',
      'positionId',
      'jobTitleId',
      'address',
      'type',
      'expectedOnboardDate',
      'quantity',
      'experienceNumber',
      'recruitmentReason',
      'priority'
    ];

    const isUpdateData = fieldsToCompare.some(field => {
      const oldVal = jobDb[field];
      const newVal = updateJobRecruitmentDto[field];

      // Nếu là Date, so sánh bằng getTime()
      if (oldVal instanceof Date && newVal instanceof Date) {
        return oldVal.getTime() !== newVal.getTime();
      }

      // Nếu 1 trong 2 là Date nhưng không cùng kiểu, coi là khác
      if ((oldVal instanceof Date) !== (newVal instanceof Date)) {
        return true;
      }
      
      return oldVal !== newVal;
    });

    return await this.dataSource
      .transaction(async (manager) => {

        // check trường hợp cập nhật lại thông tin từ chối
        const isUpdateJobReject = jobDb.status === JobStatus.REJECTED;

        const jobRecruitmentUpdatePayload: Partial<Job> = {
          ...updateJobRecruitmentDto,
          tag: updateJobRecruitmentDto.priority === JobPriority.URGENT ? JobTag.HOT : JobTag.NEW,
          // minSalary: updateJobRecruitmentDto.minExpectedSalary,
          // maxSalary: updateJobRecruitmentDto.maxExpectedSalary
        };

        if (jobDb.jobTitleId !== jobTitleId ) {
          const jobName = await this.jobTitleRepo.findOne({
            where: {id: jobTitleId},
            select: ['id','name']
          })
          if(!jobName) throw new NotFoundException("Chức danh tuyển dụng không tồn tại!")
          jobRecruitmentUpdatePayload.name = jobName.name;
        }

        let listApproverIds: string[] = []; 

        if (isUpdateJobReject || isUpdateData) {
          const listApprovers  = await this.jobApproverRepo.find({
            where: { requestGroupId: jobDb.requestGroupId },
            select: ['id','approverId']
          });

          if(listApprovers.length > 0) {
            jobRecruitmentUpdatePayload.status = JobStatus.PENDING;
            listApproverIds = listApprovers.map((item) => item.approverId);
          }
          else jobRecruitmentUpdatePayload.status = JobStatus.APPROVED;
          
          jobRecruitmentUpdatePayload.hrRejectReason = null;
          jobRecruitmentUpdatePayload.hrRejectedById = null;
          
        } 

        await manager.update(Job, id, jobRecruitmentUpdatePayload);

        await manager.update(JobApprover, { jobId: jobDb.id }, { status: JobApproverStatus.PENDING, reasonReject: null });

        if(listApproverIds.length > 0){
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Yêu cầu tuyển dụng',
              content: 'Có yêu cầu tuyển dụng mới cần phê duyệt.',
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/proposals-job-recruitment', // path đi vào phần phê duyệt,
              createdById: user.id,
              userIds: listApproverIds,
            },
            isPushFCM: true,
            manager,
          });
        }

        jobLog = {
          type: JobLogType.JOB_RECRUITMENT,
          action: JobLogAction.UPDATE,
          jobId: id,
          oldData: instanceToPlain(jobDb),
          newData: instanceToPlain(jobRecruitmentUpdatePayload),
        };

      })
      .then(() => this.jobLogService.createJobLog(jobLog, user))
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }


  async deleteJobRecruitment(id: string, user: UserRequest) {
    const jobDb = await this.jobRepo.findOne({
      where: { id },
      select: ['id', 'status', 'createdById'],
    });

    this.jobHandle.errorNotFoundConflict(jobDb, false, user);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.softDelete(Job, id);

        await manager.delete(JobApprover, { jobId: id });

        await this.jobLogService.createLogDeleteJobRecruitment(id, user, manager);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListJobRecruitment(getListJobRecruitmentDto: GetListJobRecruitmentDto, user: UserRequest) {
    const {
      page,
      take,
      orderBy,
      order,
      search,
      type,
      priority,
      orgUnitId,
      industryId,
      positionId,
      createdById,
      status
    } = getListJobRecruitmentDto;

    const whereItem: FindOptionsWhere<Job> = {};
    if(status){
      whereItem.status = status
    }

    if (type) whereItem.type = type;
    if (priority) whereItem.priority = priority;
    if (orgUnitId) {
      const [orgUnit, listChildOrgUnit] = await Promise.all([
        this.orgUnitRepo.findOne({
          where: { id: orgUnitId},
          select: ['type']
        }),

        this.orgUnitRepo.find({
          where: { type: OrgUnitType.DEPARTMENT.toString() as unknown as OrgUnitType, parentId: orgUnitId},
          select: ['id']
        })
      ]) 

      if (orgUnit && (orgUnit.type === OrgUnitType.BOARD_OF_DIRECTORS || orgUnit.type === OrgUnitType.DEPARTMENT)) whereItem.orgUnitId = orgUnitId;
      else {
        const listOrgUnitIds = [...orgUnitId, listChildOrgUnit.map(item => item.id)];
        whereItem.orgUnitId = In(listOrgUnitIds);
      }
    }    
    else {

      const listOrgUnitManager = await this.orgUnitService.getManagedDepartmentsByUser(user);
      
      const listOrgUnitManagerIds = listOrgUnitManager.map((o) => o.id);

      if(listOrgUnitManagerIds.length === 0){
        return { total: 0, list: [] }
      }

      whereItem.orgUnitId = In(listOrgUnitManagerIds);
    }
    if (industryId) whereItem.industryId = industryId;
    if (positionId) whereItem.positionId = positionId;
    if (createdById) whereItem.createdById = createdById;

    let where: FindOptionsWhere<Job>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'address'],
        search,
        whereItem,
      });
    
    const isDivisionDirectorOrHR = await this.jobTitleService.isDivisionDirectorOrHR(user);

    const [list, total] = await this.jobRepo.findAndCount({
      where,
      relations: { orgUnit: { parent: true}, industry: true, position: true, hrRejectedBy: true,  jobApprovers: { approver: true}, createdBy: true },
      select: {
        orgUnit: { id: true, name: true, parent: { id: true, name: true} },
        industry: { id: true, name: true },
        position: { id: true, name: true },
        hrRejectedBy: { id: true, name: true},
        jobApprovers: { id: true, reasonReject: true, status: true, approver: { id: true, name: true, url: true}, opinion: true},
        createdBy: { id: true, name: true, url: true },
      },
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });
    
    let result: Job[] = [];
    if (!isDivisionDirectorOrHR) {
      result = list.map((job: any) => {
        delete job.minExpectedSalary;
        delete job.maxExpectedSalary;
        delete job.minSalary;
        delete job.maxSalary;
        return job;
      })
    } else result = list;

    return { total, list: result };
  }

  async getJobRecruitment(id: string) {
    const [jobDb] = await Promise.all([
      this.jobRepo.findOne({
        where: { id },
        relations: { orgUnit: { parent: true}, industry: true, position: true },
        select: {
          orgUnit: { id: true, name: true, parent: { id: true, name: true} },
          industry: { id: true, name: true },
          position: { id: true, name: true },
        },
      }),

    ]);

    if (!jobDb) throw new NotFoundException('Yêu cầu tuyển dụng không tồn tại!');
    const jobApprovers = await 
          this.jobApproverRepo.find({
        where: { requestGroupId: jobDb.requestGroupId },
        relations: { approver: true },
        select: { approver: { id: true, name: true } },
    })
    jobDb.jobApprovers = jobApprovers;

    return jobDb;
  }

  async getListNeedApproveByUserGroupedByJob(getListNeedApproveByUserDto: GetListNeedApproveByUserDto, userId: string) {

    const { page, take, search, status } = getListNeedApproveByUserDto;

    const qb = this.jobRequestGroupRepo
      .createQueryBuilder('jobRequestGroup')

      // Join các job trong group
      .innerJoinAndSelect('jobRequestGroup.jobs', 'job', 'job.deletedAt IS NULL')

    //  .leftJoinAndSelect('jobRequestGroup.jobs', 'job')
      .leftJoinAndSelect('job.orgUnit', 'orgUnit')
      .leftJoinAndSelect('orgUnit.parent', 'parentOrgUnit')
      .leftJoinAndSelect('job.position', 'position')
      .leftJoinAndSelect('job.industry', 'industry')
      .leftJoinAndSelect('job.createdBy', 'createdBy')

      .leftJoinAndSelect('job.jobApprovers', 'jobApprover')
      .leftJoinAndSelect('jobApprover.approver', 'jobApproverUser')

      // Join người tạo group
      .leftJoinAndSelect('jobRequestGroup.createdBy', 'createdByGroup')

      // Join toàn bộ approver của group
      .leftJoinAndSelect('jobRequestGroup.jobApprovers', 'groupApprover')
      .leftJoinAndSelect('groupApprover.approver', 'groupApproverUser')

      // CHỈ lấy các group mà user đang là approver
      .where('groupApprover.approverId = :userId', { userId });


    if (search) {
      qb.andWhere('job.name LIKE :search', { search: `%${search}%` });
    }

    if (status) {
      qb.andWhere('groupApprover.status = :status', { status });
    } else {
      qb.addSelect(
        `CASE 
          WHEN groupApprover.status = :pending THEN 0
          WHEN groupApprover.status = :approved THEN 1
          WHEN groupApprover.status = :rejected THEN 2
          ELSE 3 
        END`, 
        'status_priority'
      );

      qb.addOrderBy('status_priority', 'ASC');

      qb.setParameters({
        approved: JobApproverStatus.APPROVED,
        pending: JobApproverStatus.PENDING,
        rejected: JobApproverStatus.REJECTED,
      });
    }

    qb.orderBy({
      'jobRequestGroup.updatedAt': 'DESC',
      'jobRequestGroup.createdAt': 'DESC',
    });

    qb.skip((page - 1) * take).take(take);

    const [list, total] = await qb.getManyAndCount();

    const userIds = [...new Set(list.map(item => item.createdById).filter(Boolean))];

    const userOrgUnitPosition = await this.userOrgUnitPositionRepo.find({
      where: { userId: In(userIds) },
      relations: { orgUnit: true, position: true },
      select: {
        orgUnit: { id: true, name: true },
        position: { id: true, name: true, level: true },
      },
    })

    const bestUserOrgUnitPositionMap = new Map<string, UserOrgUnitPosition>();
    for (const item of userOrgUnitPosition) {
      const current = bestUserOrgUnitPositionMap.get(item.userId);
      // lấy postion cao nhất
      if (!current || item.position.level < current.position.level) {
        bestUserOrgUnitPositionMap.set(item.userId, item);
      }
    }

    const resultList = list.map(item => {
      const userOrgUnitPosition = bestUserOrgUnitPositionMap.get(item.createdById) || null;
      return { 
        ...item,
        userOrgUnitPosition: userOrgUnitPosition
      }      
    })
      
    return { total, list: resultList };

  }

  async getListNeedApproveByUser(getListNeedApproveByUserDto: GetListNeedApproveByUserDto, user: UserRequest) {

    const { page, take, search, status, orgUnitId, positionId } = getListNeedApproveByUserDto;

    const qb = this.jobApproverRepo
      .createQueryBuilder('jobApprover')
      .leftJoinAndSelect('jobApprover.job', 'job')
      .leftJoinAndSelect('job.orgUnit', 'orgUnit')
      .leftJoinAndSelect('orgUnit.parent', 'parentOrgUnit')
      .leftJoinAndSelect('job.position', 'position')
      .leftJoinAndSelect('job.industry', 'industry')
      .leftJoinAndSelect('job.jobApprovers', 'jobApprovers')
      .leftJoinAndSelect('job.createdBy', 'createdBy')
      .leftJoinAndSelect('jobApprovers.approver', 'approver')
      .where('jobApprover.approverId = :userId', { userId: user.id });

    // Tìm kiếm theo tên job nếu có search
    if (search) {
      qb.andWhere('job.name LIKE :search', { search: `%${search}%` });
    }

    if (orgUnitId) {
      qb.andWhere('orgUnit.id = :orgUnitId', {orgUnitId})
    }

    if (positionId) {
      qb.andWhere('position.id = :positionId', {positionId})
    }

    if (status){
      qb.andWhere('jobApprover.status = :status', { status })
    } else{
      // Thêm field ảo `status_priority` để sort bằng CASE
      qb.addSelect(
        `CASE 
          WHEN jobApprover.status = :pending THEN 0
          WHEN jobApprover.status = :approved THEN 1
          WHEN jobApprover.status = :rejected THEN 2
          ELSE 3 
        END`, 
        'status_priority'
      );
  
      //  Sắp xếp theo field ảo
      qb.addOrderBy('status_priority', 'ASC');
  
      // Thêm các parameter cần thiết
      qb.setParameters({
        approved: JobApproverStatus.APPROVED,
        pending: JobApproverStatus.PENDING,
        rejected: JobApproverStatus.REJECTED,
      });
    }
    //  Phân trang
    qb.skip((page - 1) * take).take(take);

    const [list, total] = await qb.getManyAndCount();

    const userIds = [...new Set(list.map(item => item.createdById).filter(Boolean))];

    const userOrgUnitPosition = await this.userOrgUnitPositionRepo.find({
      where: { userId: In(userIds) },
      relations: { orgUnit: true, position: true },
      select: {
        orgUnit: { id: true, name: true },
        position: { id: true, name: true, level: true },
      },
    })

    const bestUserOrgUnitPositionMap = new Map<string, UserOrgUnitPosition>();
    for (const item of userOrgUnitPosition) {
      const current = bestUserOrgUnitPositionMap.get(item.userId);
      // lấy postion cao nhất
      if (!current || item.position.level < current.position.level) {
        bestUserOrgUnitPositionMap.set(item.userId, item);
      }
    }

    const resultList = plainToInstance(
      NeedApproveDto,
      list.map((item) => {
        const userOrgUnitPosition = bestUserOrgUnitPositionMap.get(item.createdById) || null;
        return {
          ...item,
          userOrgUnitPosition,
        };
      }),
      { excludeExtraneousValues: true },
    );
      
    return { total, list: resultList };
  }

  async getNeedApproveDetail(id: string, user: UserRequest) {
    const qb = this.jobApproverRepo
      .createQueryBuilder('jobApprover')
      .leftJoinAndSelect('jobApprover.job', 'job')
      .leftJoinAndSelect('job.orgUnit', 'orgUnit')
      .leftJoinAndSelect('orgUnit.parent', 'parentOrgUnit')
      .leftJoinAndSelect('job.position', 'position')
      .leftJoinAndSelect('job.industry', 'industry')
      .leftJoinAndSelect('job.jobApprovers', 'jobApprovers')
      .leftJoinAndSelect('job.createdBy', 'createdBy')
      .leftJoinAndSelect('jobApprovers.approver', 'approver')
      .where('jobApprover.id = :id', { id })
      .andWhere('jobApprover.approverId = :userId', { userId: user.id });

    const item = await qb.getOne();

    if (!item) {
      throw new NotFoundException(`NeedApprove with id ${id} not found`);
    }

    // Lấy userOrgUnitPosition cho createdBy
    let userOrgUnitPosition: UserOrgUnitPosition | null = null;

    if (item.createdById) {
      const userOrgUnitPositions = await this.userOrgUnitPositionRepo.find({
        where: { userId: item.createdById },
        relations: { orgUnit: true, position: true },
        select: {
          orgUnit: { id: true, name: true },
          position: { id: true, name: true, level: true },
        },
      });

      if (userOrgUnitPositions.length) {
        userOrgUnitPosition = userOrgUnitPositions.reduce((best, cur) =>
          !best || cur.position.level < best.position.level ? cur : best,
          null as UserOrgUnitPosition | null,
        );
      }
    }

    return {
      ...item,
      userOrgUnitPosition,
    };
  }

  async approveMultipleJobRecruitments(
    idRequestGroup: string,
    dto: ApproveMultipleJobRecruitmentDto,
    user: UserRequest
  ) {

    const requestJobRecruitment = await this.jobRequestGroupRepo.findOne({
      where: { id: idRequestGroup },
      select: ['id'],
    });

    if (!requestJobRecruitment) throw new NotFoundException('Phê duyệt không tồn tại!');

    return this.dataSource.transaction(async (manager) => {
      const listHR = await this.userRepo.find({
        where: { type: UserType.HR }
      });
      const listHRIds = listHR.map((item) => item.id);

      for (const item of dto.items) {
        const { status, reasonReject, id, opinion } = item;

        const jobApproverDb = await this.jobApproverRepo.findOne({
          where: { id: id, requestGroupId: idRequestGroup },
          select: ['id', 'jobId', 'approverId', 'createdById'],
        });

        if (!jobApproverDb) throw new NotFoundException(`Phê duyệt không tồn tại: ${id}`);

        if (jobApproverDb.approverId !== user.id)
          throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này!');

        await manager.update(JobApprover, id, {
          status,
          opinion,
          ...(status === JobApproverStatus.REJECTED && { reasonReject }),
        });

        const jobId = jobApproverDb.jobId;

        if (status === JobApproverStatus.APPROVED) {
          const jobApproversNotCurrent = await this.jobApproverRepo.find({
            where: { jobId, id: Not(Equal(id)) },
            select: ['status'],
          });

          const uniqueStatus = Array.from(
            new Set(jobApproversNotCurrent.map((e) => e.status))
          );

          const isFullyApproved =
            uniqueStatus.length === 0 ||
            (uniqueStatus.length === 1 && 
              uniqueStatus[0] === JobApproverStatus.APPROVED);

          if (isFullyApproved) {
            await manager.update(Job, jobId, { status: JobStatus.APPROVED });

            await Promise.all([
              // Notify chủ yêu cầu
              this.notificationService.createNotification({
                notification: {
                  title: 'Yêu cầu tuyển dụng đã được phê duyệt',
                  content: 'Yêu cầu tuyển dụng đã được phê duyệt hoàn toàn',
                  type: NotificationType.RECRUITMENT_REQUEST,
                  path: '/dashboard/job-recruitment',
                  userId: jobApproverDb.createdById,
                  createdById: user.id,
                },
                isPushFCM: true,
                manager,
              }),

              // Notify HR
              this.notificationService.createManyNotification({
                notification: {
                  title: 'Có yêu cầu tuyển dụng mới',
                  content: 'Có yêu cầu tuyển dụng mới',
                  type: NotificationType.RECRUITMENT_REQUEST,
                  path: '/dashboard/job-hr',
                  userIds: listHRIds,
                  createdById: jobApproverDb.createdById,
                },
                isPushFCM: true,
                manager,
              }),
            ]);
          } else {
            await this.notificationService.createNotification({
              notification: {
                title: 'Yêu cầu tuyển dụng đã được phê duyệt',
                content: `Yêu cầu tuyển dụng đã được phê duyệt bởi ${user.name}`,
                type: NotificationType.RECRUITMENT_REQUEST,
                path: '/dashboard/job-recruitment',
                userId: jobApproverDb.createdById,
                createdById: user.id,
              },
              isPushFCM: true,
              manager,
            });
          }
        }

        if (status === JobApproverStatus.REJECTED) {
          await manager.update(Job, jobId, { status: JobStatus.REJECTED });

          await this.notificationService.createNotification({
            notification: {
              title: 'Yêu cầu tuyển dụng đã bị từ chối',
              content: `Yêu cầu tuyển dụng đã bị từ chối bởi ${user.name}`,
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/job-recruitment',
              createdById: user.id,
              userId: jobApproverDb.createdById,
            },
            isPushFCM: true,
            manager,
          });
        }

        if (status === JobApproverStatus.PENDING){
          await this.notificationService.createNotification({
            notification: {
              title: 'Có thảo luận mới trong yêu cầu tuyển dụng',
              content: `Yêu cầu tuyển dụng đã có thảo luận mới từ ${user.name}`,
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/job-recruitment',
              createdById: user.id,
              userId: jobApproverDb.createdById,
            },
            isPushFCM: true,
            manager,
          });
        }

        const dataLog: JobApproverLogDto = {
          type: JobLogType.JOB_APPROVER,
          action: status === JobApproverStatus.PENDING && opinion ? JobLogAction.COMMENT :  status === JobApproverStatus.APPROVED ? JobLogAction.APPROVE : JobLogAction.REJECT,
          jobId: jobId,
          reasonReject: reasonReject || null,
          opinion: status === JobApproverStatus.PENDING ? opinion : null
        }
        await this.jobLogService.createJobApproverLog(
          dataLog,
          user,
          manager,
        )
      }

      return { success: true };
    });
  }

  async getListDeleteJobRecruitment(getListDeleteJobRecruitmentDto: GetListDeleteJobRecruitmentDto ,user: UserRequest) {
    
    const listOrgUnitManager = await this.orgUnitService.getManagedDepartmentsByUser(user);
    
    const listOrgUnitManagerIds = listOrgUnitManager.map((o) => o.id);

    if(listOrgUnitManagerIds.length === 0){
      return { total: 0, list: [] }
    }

    const { page, take } = getListDeleteJobRecruitmentDto;

    const [list, total] = await this.jobLogRepo
      .createQueryBuilder('jobLog')
      .withDeleted()
      .leftJoinAndMapOne('jobLog.job', Job, 'job', 'job.id = jobLog.jobId')
      .leftJoin('job.orgUnit', 'orgUnit')
      .leftJoin('job.jobTitle', 'jobTitle')
      .leftJoin('job.position','position')
      .addSelect(['position.name', 'position.id', 'orgUnit.id', 'orgUnit.name', 'jobTitle.id', 'jobTitle.name']) 
      .leftJoin('jobLog.createdBy', 'user')
      .addSelect(['user.id', 'user.name', 'user.url']) 
      .where('job.orgUnitId IN (:...orgUnitIds)', { orgUnitIds: listOrgUnitManagerIds })
      .andWhere('jobLog.action = :action', { action: JobLogAction.DELETE })
      .orderBy({ 'jobLog.createdAt': 'DESC' })
      .skip((page - 1) * take)
      .take(take)
      .getManyAndCount();

    return { total, list };
  }

  async restoreDeletedData(id: string, user: UserRequest){

    const jobLog = await this.jobLogRepo.findOne({
      where: {id},
      select: ['id', 'jobId']
    })

    if (!jobLog) throw new NotFoundException('Không có dữ liệu');

    const jobDb = await this.jobRepo.findOne({
      where: { id: jobLog.jobId},
      withDeleted: true
    })

    if (!jobDb) throw new NotFoundException('Không tồn tại yêu cầu tuyển dụng');

    const [conflictJobDb, jobTitle]  = await Promise.all([
      this.jobRepo.exists({
        where: {
          jobTitleId: jobDb.jobTitleId,
          orgUnitId: jobDb.orgUnitId,
          positionId: jobDb.positionId,
          status: Not(In([JobStatus.COMPLETED, JobStatus.REJECTED])),
        },
      }),

      this.jobTitleRepo.findOne({
        where: {id: jobDb.jobTitleId},
        select: ['id','name']
      })
    ]) 

    if (conflictJobDb)
      throw new ConflictException('Tồn tại yêu cầu tuyển dụng chưa được xử lí xong!');

    if(!jobTitle) throw new NotFoundException("Chức danh tuyển dụng không tồn tại!");

    const isGeneralDirector = user.positionId ?  await this.positionRepo.exists({
      where: { id: user.positionId, name: 'Tổng giám đốc'}
    }) : false;

    let jobApproversInsert: Partial<JobApprover>[] = [];

    let managerIds: string[] = [];

    if (!isGeneralDirector) {      
      // lấy các quản lý, bỏ người tạo
      managerIds = (await this.jobHandle.getManagerIdsOrgUnit(jobDb.orgUnitId)).filter((e) => e !== user.id);
  
      // tìm GĐ khối nhân sự, nếu k có thì tìm trưởng phòng nhân sự
  
      const hrManagerId = await this.jobHandle.getHrManagerId();
  
      if (hrManagerId && hrManagerId !== user.id) managerIds.push(hrManagerId);
    }

    if (jobDb.status === JobStatus.PENDING)
      jobApproversInsert = managerIds.map((managerId) => ({
        id: uuidv4(),
        jobId: jobDb.id,
        approverId: managerId,
        createdById: user.id,
        requestGroupId: jobDb.requestGroupId
      }));

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(Job, {id: jobDb.id }, { deletedAt: null, updatedById: user.id})

        await manager.delete(JobLog, id);

        if (jobApproversInsert.length > 0){
          await manager.insert(JobApprover, jobApproversInsert);
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Yêu cầu tuyển dụng',
              content: 'Có yêu cầu tuyển dụng mới cần phê duyệt.',
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/proposals-job-recruitment', // path đi vào phần phê duyệt,
              createdById: user.id,
              userIds: managerIds,
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

  async approveMultipleGroupJobRequest(approveMultipleGroupRequestDto: ApproveMultipleGroupRequestDto, user: UserRequest) {
    
    const { status, reasonReject, listRequestGroupId } = approveMultipleGroupRequestDto;
    
    const listJobApprovers = await this.jobApproverRepo.find({
      where: { requestGroupId: In(listRequestGroupId), approverId: user.id, status: JobApproverStatus.PENDING },
      select: ['id', 'requestGroupId'],
    })

    if (listJobApprovers.length === 0) throw new NotFoundException('Không có yêu cầu phê duyệt nào cần xử lí!');

     return this.dataSource.transaction(async (manager) => {
      const listHR = await this.userRepo.find({
        where: { type: UserType.HR }
      });
      const listHRIds = listHR.map((item) => item.id);

      for (const item of listJobApprovers) {

        const jobApproverDb = await this.jobApproverRepo.findOne({
          where: { id: item.id, requestGroupId: item.requestGroupId },
          select: ['id', 'jobId', 'approverId', 'createdById'],
        });

        if (!jobApproverDb) throw new NotFoundException(`Phê duyệt không tồn tại: ${item.id}`);

        if (jobApproverDb.approverId !== user.id)
          throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này!');

        await manager.update(JobApprover, item.id, {
          status,
          ...(status === JobApproverStatus.REJECTED && { reasonReject }),
        });

        const jobId = jobApproverDb.jobId;

        if (status === JobApproverStatus.APPROVED) {
          const jobApproversNotCurrent = await this.jobApproverRepo.find({
            where: { jobId, id: Not(Equal(item.id)) },
            select: ['status'],
          });

          const uniqueStatus = Array.from(
            new Set(jobApproversNotCurrent.map((e) => e.status))
          );

          const isFullyApproved =
            uniqueStatus.length === 0 ||
            (uniqueStatus.length === 1 && 
              uniqueStatus[0] === JobApproverStatus.APPROVED);

          if (isFullyApproved) {
            await manager.update(Job, jobId, { status: JobStatus.APPROVED });

            await Promise.all([
              // Notify chủ yêu cầu
              this.notificationService.createNotification({
                notification: {
                  title: 'Yêu cầu tuyển dụng đã được phê duyệt',
                  content: 'Yêu cầu tuyển dụng đã được phê duyệt hoàn toàn',
                  type: NotificationType.RECRUITMENT_REQUEST,
                  path: '/dashboard/job-recruitment',
                  userId: jobApproverDb.createdById,
                  createdById: user.id,
                },
                isPushFCM: true,
                manager,
              }),

              // Notify HR
              this.notificationService.createManyNotification({
                notification: {
                  title: 'Có yêu cầu tuyển dụng mới',
                  content: 'Có yêu cầu tuyển dụng mới',
                  type: NotificationType.RECRUITMENT_REQUEST,
                  path: '/dashboard/job-hr',
                  userIds: listHRIds,
                  createdById: jobApproverDb.createdById,
                },
                isPushFCM: true,
                manager,
              }),
            ]);
          } else {
            await this.notificationService.createNotification({
              notification: {
                title: 'Yêu cầu tuyển dụng đã được phê duyệt',
                content: `Yêu cầu tuyển dụng đã được phê duyệt bởi ${user.name}`,
                type: NotificationType.RECRUITMENT_REQUEST,
                path: '/dashboard/job-recruitment',
                userId: jobApproverDb.createdById,
                createdById: user.id,
              },
              isPushFCM: true,
              manager,
            });
          }
        }

        if (status === JobApproverStatus.REJECTED) {
          await manager.update(Job, jobId, { status: JobStatus.REJECTED });

          await this.notificationService.createNotification({
            notification: {
              title: 'Yêu cầu tuyển dụng đã bị từ chối',
              content: `Yêu cầu tuyển dụng đã bị từ chối bởi ${user.name}`,
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/job-recruitment',
              createdById: user.id,
              userId: jobApproverDb.createdById,
            },
            isPushFCM: true,
            manager,
          });
        }

        const dataLog: JobApproverLogDto = {
          type: JobLogType.JOB_APPROVER,
          action: status === JobApproverStatus.APPROVED ? JobLogAction.APPROVE : JobLogAction.REJECT,
          jobId: jobId,
          reasonReject: reasonReject || null,
        }
        await this.jobLogService.createJobApproverLog(
          dataLog,
          user,
          manager,
        )
      }
      return { success: true };
    });
  }

   async approveJobRecruitment(
    id: string,
    approveJobRecruitmentDto: ApproveJobRecruitmentDto,
    user: UserRequest
  ) {

    console.log('userId', user.id);

    const { status, reasonReject, opinion } = approveJobRecruitmentDto;

    const jobApproverDb = await this.jobApproverRepo.findOne({
      where: { id, },
      select: ['id', 'jobId', 'approverId', 'createdById'],
    });

    console.log('jobApproverDb', jobApproverDb);

    if (!jobApproverDb) throw new NotFoundException(`Phê duyệt ${id} không tồn tại!`);

    if (jobApproverDb.approverId !== user.id)
      throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này!');

    return this.dataSource.transaction(async (manager) => {
      const listHR = await this.userRepo.find({
        where: { type: UserType.HR }
      });

      const listHRIds = listHR.map((item) => item.id);

      await manager.update(JobApprover, id, {
        status,
        opinion,
        ...(status === JobApproverStatus.REJECTED && { reasonReject }),
      });

      const jobId = jobApproverDb.jobId;

      if (status === JobApproverStatus.APPROVED) {
        const jobApproversNotCurrent = await this.jobApproverRepo.find({
          where: { jobId, id: Not(Equal(id)) },
          select: ['status'],
        });

        const uniqueStatus = Array.from(
          new Set(jobApproversNotCurrent.map((e) => e.status))
        );

        const isFullyApproved =
          uniqueStatus.length === 0 ||
          (uniqueStatus.length === 1 && 
            uniqueStatus[0] === JobApproverStatus.APPROVED);

        if (isFullyApproved) {
          await manager.update(Job, jobId, { status: JobStatus.APPROVED });

          await Promise.all([
            // Notify chủ yêu cầu
            this.notificationService.createNotification({
              notification: {
                title: 'Yêu cầu tuyển dụng đã được phê duyệt',
                content: 'Yêu cầu tuyển dụng đã được phê duyệt hoàn toàn',
                type: NotificationType.RECRUITMENT_REQUEST,
                path: '/dashboard/job-recruitment',
                userId: jobApproverDb.createdById,
                createdById: user.id,
              },
              isPushFCM: true,
              manager,
            }),

            // Notify HR
            this.notificationService.createManyNotification({
              notification: {
                title: 'Có yêu cầu tuyển dụng mới',
                content: 'Có yêu cầu tuyển dụng mới',
                type: NotificationType.RECRUITMENT_REQUEST,
                path: '/dashboard/job-hr',
                userIds: listHRIds,
                createdById: jobApproverDb.createdById,
              },
              isPushFCM: true,
              manager,
            }),
          ]);
        } else {
          await this.notificationService.createNotification({
            notification: {
              title: 'Yêu cầu tuyển dụng đã được phê duyệt',
              content: `Yêu cầu tuyển dụng đã được phê duyệt bởi ${user.name}`,
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/job-recruitment',
              userId: jobApproverDb.createdById,
              createdById: user.id,
            },
            isPushFCM: true,
            manager,
          });
        }
      }

      if (status === JobApproverStatus.REJECTED) {
        await manager.update(Job, jobId, { status: JobStatus.REJECTED });

        await this.notificationService.createNotification({
          notification: {
            title: 'Yêu cầu tuyển dụng đã bị từ chối',
            content: `Yêu cầu tuyển dụng đã bị từ chối bởi ${user.name}`,
            type: NotificationType.RECRUITMENT_REQUEST,
            path: '/dashboard/job-recruitment',
            createdById: user.id,
            userId: jobApproverDb.createdById,
          },
          isPushFCM: true,
          manager,
        });
      }

      if (status === JobApproverStatus.PENDING){
        await this.notificationService.createNotification({
          notification: {
            title: 'Có thảo luận mới trong yêu cầu tuyển dụng',
            content: `Yêu cầu tuyển dụng đã có thảo luận mới từ ${user.name}`,
            type: NotificationType.RECRUITMENT_REQUEST,
            path: '/dashboard/job-recruitment',
            createdById: user.id,
            userId: jobApproverDb.createdById,
          },
          isPushFCM: true,
          manager,
        });
      }

      const dataLog: JobApproverLogDto = {
        type: JobLogType.JOB_APPROVER,
        action: status === JobApproverStatus.PENDING && opinion ? JobLogAction.COMMENT :  status === JobApproverStatus.APPROVED ? JobLogAction.APPROVE : JobLogAction.REJECT,
        jobId: jobId,
        reasonReject: reasonReject || null,
        opinion: status === JobApproverStatus.PENDING ? opinion : null
      }
      await this.jobLogService.createJobApproverLog(
        dataLog,
        user,
        manager,
      )
    
      return { success: true };
    });
  }

}
