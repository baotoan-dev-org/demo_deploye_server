import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, Like, Not, Repository, TreeRepository } from 'typeorm';
import { OrgUnit } from '../org-unit/entities/org-unit.entity';
import { CreateJobRecruitmentDto } from './dtos/create-job-recruitment.dto';
import { UpdateJobRecruitmentDto } from './dtos/update-job-recruitment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Industry } from '../industry/entities/industry.entity';
import { Position } from '../position/entities/position.entity';
import { Job } from './entities/job.entity';
import { JobStatus } from './job.enum';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrgUnitType } from '../org-unit/org-unit.enum';
import { JobTitle } from '../job-title/entities/job-title.entity';
import { PositionType } from '../position/position.enum';

@Injectable()
export class JobHandle {
  private readonly orgUnitTreeRepo: TreeRepository<OrgUnit>;

  constructor(
    private dataSource: DataSource,

    @InjectRepository(OrgUnit)
    private orgUnitRepo: Repository<OrgUnit>,

    @InjectRepository(Position)
    private positionRepo: Repository<Position>,

    @InjectRepository(Industry)
    private industryRepo: Repository<Industry>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>
  ) {
    this.orgUnitTreeRepo = this.dataSource.getTreeRepository(OrgUnit);
  }

  async getManagerIdsOrgUnit(orgUnitId: string) {
    const ancestors = await this.orgUnitTreeRepo.findAncestors({ id: orgUnitId } as OrgUnit);

    return Array.from(new Set(ancestors.filter((e) => e.id !== orgUnitId && e.managerId).map((e) => e.managerId)));
  }

  async errorOgrUnitIndustryPosition(
    dto: CreateJobRecruitmentDto | UpdateJobRecruitmentDto,
    user: UserRequest,
  ) {
    const { orgUnitId, positionId } = dto;

    const [orgUnitDb, positionDb, generalDirector, userPosition] = await Promise.all([
      this.orgUnitRepo.findOne({ where: { id: orgUnitId }, select: ['id', 'parentId','type'] }),
      this.positionRepo.exists({ where: { id: positionId } }),
      this.positionRepo.findOne({ where: { name: 'Tổng giám đốc' }, select: ['id']}),
      this.positionRepo.findOne({ where: { id: user.positionId }, select: ['type']})
    ]);

    if (!orgUnitDb) throw new NotFoundException('Đơn vị không tồn tại!');

    let isNotManager = true;

    if (user.positionId === generalDirector.id){
      // check xem có phải tổng giám đốc không
      isNotManager = false;
    }
    else if (orgUnitDb.parentId) {
      if (userPosition.type === PositionType.ASSISTANT && orgUnitDb.parentId === user.orgUnitId)
        isNotManager = false;
      else {
        const managerId = await this.orgUnitRepo.findOne({
          where: { id: orgUnitDb.parentId},
          select: ['managerId']
        })
  
        isNotManager = managerId.managerId !== user.id 
      }  
    } 

    const isTypeInvalid = Number(orgUnitDb.type) > 5;
    
    if (isNotManager|| isTypeInvalid)
      throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này!');

    if (!positionDb) throw new NotFoundException('Chức danh không tồn tại!');
  }

  errorNotFoundConflict(jobDb: Job, conflictJobDb: boolean, user: UserRequest) {
    if (!jobDb) throw new NotFoundException('Yêu cầu tuyển dụng không tồn tại!');

    // if (jobDb.createdById !== user.id)
    //   throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này');

    if (
      jobDb.status !== JobStatus.PENDING && jobDb.status !== JobStatus.REJECTED
    )
      throw new BadRequestException('Thao tác không khả dụng!');

    if (conflictJobDb)
      throw new ConflictException('Tồn tại yêu cầu tuyển dụng chưa được xử lí xong!');
  }

  async getHrManagerId(){
    // 1. Tìm khối nhân sự
    const hrDivision = await this.orgUnitRepo.findOne({
      where: { name: Like('%nhân sự%'), type: OrgUnitType.DIVISION.toString() as unknown as OrgUnitType },
    });

    if (hrDivision?.managerId) {
      return hrDivision.managerId;
    }

    // 2. Fallback: tìm phòng nhân sự
    const hrDepartment = await this.orgUnitRepo.findOne({
      where: { name: Like('%nhân sự%'), type: OrgUnitType.DEPARTMENT.toString() as unknown as OrgUnitType },
    });

    if (hrDepartment?.managerId) {
      return hrDepartment.managerId;
    }

    // 3. Không có ai
    return null;
  }

  async validateRecruitmentItem(item: CreateJobRecruitmentDto, user: UserRequest, jobTitleMap: Map<string, string>) {
    const errors: string[] = [];
    const { orgUnitId, positionId, jobTitleId } = item;

    const [orgUnitDb, positionDb, generalDirector, userPosition] = await Promise.all([
      this.orgUnitRepo.findOne({ where: { id: orgUnitId }, select: ['id', 'parentId', 'type', 'managerId'] }),
      this.positionRepo.exists({ where: { id: positionId } }),
    //  this.jobTitleRepo.exists({ where: { id: jobTitleId } }),
      this.positionRepo.findOne({ where: { name: 'Tổng giám đốc' }, select: ['id'] }),
      this.positionRepo.findOne({ where: { id: user.positionId }, select: ['type']})
    ]);

    if (!orgUnitDb) errors.push('Đơn vị không tồn tại!');
    if (!positionDb) errors.push('Chức danh không tồn tại!');
    // if (!jobTitleDb) errors.push('Chức danh tuyển dụng không tồn tại!');

    if (!jobTitleMap.has(jobTitleId)) errors.push(`Chức danh tuyển dụng với ID ${jobTitleId} không tồn tại.`);

    let isNotManager = true;

    if (user.positionId === generalDirector?.id ) {
      isNotManager = false;
    } else if (orgUnitDb?.managerId === user.id) {
      isNotManager = false;
    } else if (orgUnitDb?.parentId) {
      if (userPosition.type === PositionType.ASSISTANT && orgUnitDb.parentId === user.orgUnitId)
        isNotManager = false;
      else {
        const managerId = await this.orgUnitRepo.findOne({
          where: { id: orgUnitDb.parentId},
          select: ['managerId']
        })
  
        isNotManager = managerId.managerId !== user.id 
      }  
    } 
    if (orgUnitDb && Number(orgUnitDb.type) > 5) {
      errors.push('Đơn vị không thuộc phạm vi cho phép!');
    }

    if (isNotManager) {
      errors.push('Bạn không có quyền thực hiện chức năng này!');
    }

    // Kiểm tra job conflict
    const conflictJob = await this.jobRepo.exists({
      where: {
        jobTitleId,
        orgUnitId,
        positionId,
        status: Not(In([JobStatus.COMPLETED, JobStatus.REJECTED])),
      },
    });

    if (conflictJob) {
      errors.push('Tồn tại yêu cầu tuyển dụng chưa được xử lý!');
    }

    return errors;
  }

}
