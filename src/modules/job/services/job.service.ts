import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from '../entities/job.entity';
import { QueryService } from '@/common/services/query.service';
import { GetListJobDto } from '../dtos/get-list-job.dto';
import { UpdateJobDto } from '../dtos/update-job.dto';
import { JobCountType, JobLogAction, JobLogType, JobStatus } from '../job.enum';
import { CreateJobDto } from '../dtos/create-job.dto';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationType } from '@/modules/notification/notification.enum';
import { ConfigService } from '@nestjs/config';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { RejectJobByHRDto } from '../dtos/reject-job-by-hr.dto';
import { Industry } from '@/modules/industry/entities/industry.entity';
import { UserType } from '@/modules/user/user.enum';
import { JobLog } from '../entities/job-log.entity';
import { CreateJobLogDto } from '../dtos/create-job-log.dto';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { JobLogService } from './job-log.service';
import { ReadJDService } from './read-jd.service';
import * as ShortUUID from "short-uuid";
import { JobTitle } from '@/modules/job-title/entities/job-title.entity';
import { JobResponseDto } from '../dtos/job-response.dto';
import { JobApprover } from '../entities/job-approver.entity';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';

const translator = ShortUUID();


@Injectable()
export class JobService {
  constructor(
    private dataSource: DataSource,

    private queryService: QueryService,

    private notificationService: NotificationService,

    private configService: ConfigService,

    private jobLogService: JobLogService,

    private readJDService: ReadJDService,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(Industry)
    private industryRepo: Repository<Industry>,

    @InjectRepository(JobLog)
    private jobLogRepo: Repository<JobLog>,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,

    @InjectRepository(JobApprover)
    private jobApproverRepo: Repository<JobApprover>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

  ) {}

  async updateJobCount(manager: EntityManager, jobId: string, type: JobCountType, incrementBy = 1) {
    await manager.increment(Job, { id: jobId }, type, incrementBy);
    // check xem đã tuyển đủ hay chưa
    if (type === JobCountType.ONBOARD) {
      const jobDb = await manager.findOne(Job, {
        where: { id: jobId, status: JobStatus.RECRUITING },
      });
      // nếu đã tuyển đủ thì chuyển trạng thái sang hoàn thành
      if (jobDb && jobDb.onboardCount >= jobDb.quantity) {
        await manager.update(Job, jobId, {
          status: JobStatus.COMPLETED,
          completionDate: new Date(),
        });

        // Noti cho chủ yêu cầu
        await this.notificationService.createNotification({
          notification: {
            title: 'Yêu cầu tuyển dụng đã được cập nhật',
            content: `Yêu cầu tuyển dụng đã tuyển đủ ứng viên`,
            type: NotificationType.RECRUITMENT_REQUEST,
            path: '/dashboard/job-recruitment', // path đi vào phần yêu cầu,
            userId: jobDb.createdById,
          },
          isPushFCM: true,
          manager,
        });
      }
    }
  }

  async createJob(id: string, createJobDto: CreateJobDto, user: UserRequest) {
    let { industryId, ownerId } = createJobDto;
    const [jobDb, isExitsIndustry] = await Promise.all([
      this.jobRepo.findOne({
        where: { id },
      }),
      this.industryRepo.findOne({
        where: { id: industryId },
        select: ['id'],
      }),
    ]);

    if (!jobDb) throw new NotFoundException('Yêu cầu công việc không tồn tại!');

    if (!isExitsIndustry) throw new NotFoundException('Ngành nghề không tồn tại!');

    if (jobDb.status !== JobStatus.APPROVED)
      throw new NotFoundException('Yêu cầu công việc phải ở trạng thái phê duyệt!');

    let jobLog: CreateJobLogDto = {
      oldData: undefined,
      newData: undefined,
      type: JobLogType.JOB_RECRUITMENT,
      action: JobLogAction.CREATE,
      jobId: '',
    };
    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(Job, id, {
          ...createJobDto,
          status: JobStatus.RECRUITING,
          postedDate: new Date(),
          slug: toSlug(createJobDto.name)
        });

        // Noti cho chủ yêu cầu
        await this.notificationService.createNotification({
          notification: {
            title: 'Yêu cầu tuyển dụng đã được đăng tuyển',
            content: `Yêu cầu tuyển dụng đã được đăng tuyển trên website ${this.configService.get('OFFICE_FE_URL')} bởi ${user.name}`,
            type: NotificationType.RECRUITMENT_REQUEST,
            path: '/dashboard/job-recruitment', // path đi vào phần yêu cầu,
            userId: jobDb.createdById,
            createdById: user.id,
          },
          isPushFCM: true,
          manager,
        });

        if (user.id !== ownerId) {
          await this.notificationService.createNotification({
            notification: {
              title: 'Bạn được phân công vào một yêu cầu tuyển dụng mới',
              content: `Bạn được phân công vào một yêu cầu tuyển dụng mới`,
              type: NotificationType.RECRUITMENT_REQUEST,
              path: '/dashboard/job-hr', // path đi vào phần công việc,
              userId: ownerId,
              createdById: user.id,
            },
            isPushFCM: true,
            manager,
          });
        }

        jobLog = {
          type: JobLogType.JOB,
          action: JobLogAction.RECRUIT,
          jobId: id,
          oldData: instanceToPlain(jobDb),
          newData: instanceToPlain(createJobDto),
        };
      })
      .then(() => this.jobLogService.createJobLog(jobLog, user))
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async updateJob(id: string, updateJobDto: UpdateJobDto, user: UserRequest) {
    const jobDb = await this.jobRepo.findOne({ where: { id } });

    if (!jobDb) throw new NotFoundException('Công việc không tồn tại!');

    let jobLog: CreateJobLogDto = {
      oldData: undefined,
      newData: undefined,
      type: JobLogType.JOB_RECRUITMENT,
      action: JobLogAction.CREATE,
      jobId: '',
    };
    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(Job, id, { ...updateJobDto });

        // Noti cho chủ yêu cầu
        await this.notificationService.createNotification({
          notification: {
            title: 'Yêu cầu tuyển dụng đã được cập nhật',
            content: `Yêu cầu tuyển dụng đã được cập nhật bởi ${user.name}`,
            type: NotificationType.RECRUITMENT_REQUEST,
            path: '/dashboard/job-recruitment', // path đi vào phần yêu cầu,
            userId: jobDb.createdById,
            createdById: user.id,
          },
          isPushFCM: true,
          manager,
        });

        jobLog = {
          type: JobLogType.JOB,
          action: JobLogAction.UPDATE,
          jobId: id,
          oldData: instanceToPlain(jobDb),
          newData: instanceToPlain(updateJobDto),
        };
      })
      .then(() => this.jobLogService.createJobLog(jobLog, user))
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteJob(id: string) {
    const jobDb = await this.jobRepo.findOne({
      where: { id },
      select: ['id', 'status', 'createdById'],
    });

    if (!jobDb) throw new NotFoundException('Công việc không tồn tại!');

    // Vì tại thời điểm này job còn đang là recruitment
    if (jobDb.status === JobStatus.PENDING)
      throw new BadRequestException('Thao tác không khả dụng!');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.softDelete(Job, id);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListJob(getListJobDto: GetListJobDto) {
    const {
      page,
      take,
      orderBy,
      order,
      search,
      type,
      priority,
      orgUnitId,
      industryIds,
      positionIds,
      isRelations,
      status,
      minSalary,
      maxSalary
    } = getListJobDto;

    const whereItem: FindOptionsWhere<Job> = {};

    if (status) {
      whereItem.status = status;
    } else {
      // lấy full job cho HR, kể cả yêu cầu chưa duyệt
      whereItem.status = Not(JobStatus.REJECTED);
    }

    if (type) whereItem.type = type;
    if (priority) whereItem.priority = priority;
    // lấy full job của org unit và các job của con org unit
    if (orgUnitId) {
      // lấy danh sách orgUnitId child
      const OrgUnitChildList = await this.getDescendantIds(orgUnitId);
      whereItem.orgUnit = In(OrgUnitChildList);
    }
    if (positionIds) whereItem.positionId = In(positionIds);
    if (industryIds) whereItem.industryId = In(industryIds);

    if (minSalary) whereItem.maxSalary = MoreThanOrEqual(minSalary);

    if (maxSalary) whereItem.minSalary = LessThanOrEqual(maxSalary);

    let where: FindOptionsWhere<Job>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'address'],
        search,
        whereItem: whereItem,
      });

    const [list, total] = await this.jobRepo.findAndCount({
      where,
      ...(isRelations
        ? {
            relations: {
              orgUnit: { parent: true },
              industry: true,
              position: true,
              owner: true,
              jobApprovers: { approver: true },
            },
            select: {
              orgUnit: { id: true, name: true, parent: { id: true, name: true } },
              industry: { id: true, name: true },
              position: { id: true, name: true },
              jobApprovers: {
                id: true,
                reasonReject: true,
                status: true,
                opinion: true,
                approver: { id: true, name: true, url: true },
              },
              owner: { id: true, name: true, url: true },
            },
          }
        : {}),
      ...this.queryService.getPagination({ page, take }),
      order: { 
        priority: 'DESC', // ưu tiên hiển thị job có priority gấp trước
        [orderBy]: order },
    });


    const dtoList = plainToInstance(JobResponseDto, list, {});

    for (const job of dtoList){
      if( job.slug ){
        job.url = `${job.slug}-${translator.fromUUID(job.id)}`;
      }
    }

    return { total, list: dtoList };
  }

  async getJob(id: string, user: UserRequest) {
    const [jobDb, jobApprover] = await Promise.all([
      this.jobRepo.findOne({
        where: { id },
        relations: { orgUnit: { parent: true }, industry: true, position: true, owner: true },
        select: {
          orgUnit: { id: true, name: true },
          industry: { id: true, name: true },
          position: { id: true, name: true, parent: { id: true, name: true } },
          owner: { id: true, name: true, url: true },
        },
      }) as Promise<JobResponseDto> ,
      this.jobApproverRepo.find({
        relations: { approver: true },
        where: { jobId: id},
        select: { id: true, status: true, reasonReject: true, opinion: true, approver: { id: true, name: true, url: true } },
      })
    ]) 

    const listUserIdsApprover = [...new Set(jobApprover.map(item => item.approver.id).filter(Boolean))];

    const userOrgUnitPosition = await this.userOrgUnitPositionRepo.find({
      where: { userId: In(listUserIdsApprover) },
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

    const approverWithPosition = jobApprover.map(item => {
      const userOrgUnitPosition = bestUserOrgUnitPositionMap.get(item.approver.id) || null;
      return { 
        ...item,
        userOrgUnitPosition: userOrgUnitPosition
        ? `${userOrgUnitPosition.position.name}${userOrgUnitPosition.position.level !== 1 ? ` - ${userOrgUnitPosition.orgUnit.name}` : ''}`
        : null
      }    
    });

    jobDb.jobApprovers = approverWithPosition;


    if (!jobDb) throw new NotFoundException('Công việc không tồn tại!');

    if (jobDb.slug) {
      jobDb.url = `${jobDb.slug}-${translator.fromUUID(jobDb.id)}`;
    }    

    if (jobDb.ownerId === user.id || user.type === UserType.ADMIN)
      return { ...jobDb, permission: true };
    return { ...jobDb, permission: false };
  }

  async getPublicJobDetail(jobUrl: string) {

    const lastDashIndex = jobUrl.lastIndexOf("-");
    if (lastDashIndex === -1) throw new NotFoundException("Invalid URL");

    const shortId = jobUrl.substring(lastDashIndex + 1);
    const id = translator.toUUID(shortId);

    const job = await this.jobRepo.findOne({
      where: { id },
      select: ['id', 'name', 'jobTitleId' , 'description', 'welfare', 'address', 'tag', 'requirement', 'type', 'minSalary', 'maxSalary' , 'orgUnitId', 'slug', 'expiredDate', 'experienceNumber'] 
    });

    if (!job) throw new NotFoundException('Công việc không tồn tại!');

    let listSimilarJobs = await this.jobRepo.createQueryBuilder('job')
      .select(['job.id', 'job.name', 'job.jobTitleId' , 'job.description', 'job.welfare', 'job.address', 'job.tag', 'job.requirement', 'job.type', 'job.minSalary', 'job.maxSalary' , 'job.orgUnitId', 'job.slug', 'job.expiredDate', 'job.experienceNumber']) 
      .where('job.status = :status', {status: JobStatus.RECRUITING})
      .andWhere('job.orgUnitId = :orgUnitId', { orgUnitId: job.orgUnitId })
      .andWhere('job.id != :jobId', { jobId: job.id })
      .limit(12)
      .getMany();

    if (listSimilarJobs.length === 0){
      listSimilarJobs = await this.jobRepo.createQueryBuilder('job')
      .where('job.status = :status', {status: JobStatus.RECRUITING})
      .limit(12)
      .getMany();
    }

    const listSimilarJobsDto = plainToInstance(JobResponseDto, listSimilarJobs, {});  

     for (const job of listSimilarJobsDto){
      if( job.slug ){
        job.url = `${job.slug}-${translator.fromUUID(job.id)}`;
      }
    }

    const jobRepsonse = plainToInstance(JobResponseDto, job, {});    
    
    jobRepsonse.listSimilarJobs = listSimilarJobsDto;

    return jobRepsonse;

  }

  async getDescendantIds(parentId: string): Promise<string[]> {
    const treeRepo = this.dataSource.getTreeRepository(OrgUnit);
    const parent = await treeRepo.findOne({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('Parent not found');

    const descendants = await treeRepo.findDescendants(parent);
    return descendants.map((d) => d.id);
  }

  async rejectJobByHR(id: string, rejectJobByHRDto: RejectJobByHRDto, user: UserRequest) {
    const jobDb = await this.jobRepo.findOne({
      where: { id },
      select: ['id', 'status', 'createdById'],
    });

    if (!jobDb) throw new NotFoundException('Công việc không tồn tại!');

    if (jobDb.status !== JobStatus.APPROVED)
      throw new BadRequestException('Thao tác không khả dụng!');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(Job, id, {
          status: JobStatus.REJECTED,
          hrRejectReason: rejectJobByHRDto.hrRejectReason,
          hrRejectedBy: { id: user.id },
        });

        // Noti cho chủ yêu cầu
        await this.notificationService.createNotification({
          notification: {
            title: 'Yêu cầu tuyển dụng đã bị từ chối',
            content: `Yêu cầu tuyển dụng đã bị từ chối bởi ${user.name}`,
            type: NotificationType.RECRUITMENT_REQUEST,
            path: '/dashboard/job-recruitment', // path đi vào phần yêu cầu,
            userId: jobDb.createdById,
            createdById: user.id,
          },
          isPushFCM: true,
          manager,
        });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getJobLog(id: string) {
    const jobLogDb = await this.jobLogRepo.find({
      relations: { createdBy: true },
      where: { jobId: id },
      select: {
        id: true,
        createdAt: true,
        type: true,
        action: true,
        jobId: true,
        changes: true,
        createdBy: { id: true, name: true, url: true },
      },
      order: { createdAt: 'DESC' },
    });

    if (!jobLogDb) throw new NotFoundException('Công việc không tồn tại!');

    return jobLogDb;
  }

  async updateSlug(){
    const jobs = await this.jobRepo.find();

    for (const job of jobs) {
      job.slug = toSlug(job.name); 
    }

    await this.jobRepo.save(jobs);
  }
}

function toSlug(str: string): string {
  return str
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // xóa dấu
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
    .trim()
    .replace(/\s+/g, "-"); // thay space = "-"
}

