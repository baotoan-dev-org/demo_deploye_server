import { QueryService } from '@/common/services/query.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateJobTitleDto } from '../dtos/create-job-title.dto';
import { GetListJobTitleDto } from '../dtos/get-list-job-title.dto';
import { UpdateJobTitleDto } from '../dtos/update-job-title.dto';
import { JobTitle } from '../entities/job-title.entity';
import { JobTitleHandle } from '../job-title.handle';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnitService } from '@/modules/org-unit/services/org-unit.service';
import { UserType } from '@/modules/user/user.enum';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { WELFARE_HTML } from '../job-title.constant';

@Injectable()
export class JobTitleService {
  constructor(
    private dataSource: DataSource,

    private jobTitleHandle: JobTitleHandle,

    private queryService: QueryService,

    private orgUnitService: OrgUnitService,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,

    @InjectRepository(OrgUnit)
    private orgUnitRepo: Repository<OrgUnit>,

    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
  ) {}

  async createJobTitle(createJobTitleDto: CreateJobTitleDto, user: UserRequest) {
    const { name, orgUnitId, positionId } = createJobTitleDto;

    const [conflict, isExitsOrgUnit, isExitsPositon] = await Promise.all([
      this.jobTitleRepo.findOne({
        where: [{ name, orgUnit: { id: orgUnitId } }],
        select: ['id', 'name'],
      }),
      this.orgUnitRepo.findOne({
        where: [{ id: orgUnitId }],
        select: ['id', 'type'],
      }),
      this.positionRepo.findOne({
        where: [{ id: positionId }],
        select: ['id'],
      }),
    ]);

    if (!isExitsOrgUnit) throw new NotFoundException(`orgUnitId: ${orgUnitId} không tồn tại!`);

    if (Number(isExitsOrgUnit.type) > 5) throw new NotFoundException('orgUnitId không hợp lệ');

    if (!isExitsPositon) throw new NotFoundException(`positionId: ${positionId} không tồn tại!`);

    this.jobTitleHandle.errorConflictName(conflict, name);

     createJobTitleDto.welfare = await this.getWelfare(positionId, orgUnitId);

    const jobTitleInsert: DeepPartial<JobTitle> = {
      ...createJobTitleDto,
      id: uuidv4(),
      createdById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(JobTitle, jobTitleInsert);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListJobTitle(getListJobTitleDto: GetListJobTitleDto) {
    let { page, take, orderBy, order, search, status, orgUnitId, positionId } = getListJobTitleDto;

    const whereItem: FindOptionsWhere<JobTitle> = {};
    if (status) whereItem.status = status;

    if (orgUnitId) {
      const listOrgUnitIds = [orgUnitId];

      const childOrgUnits = await this.orgUnitRepo.find({
        where: { parentId: orgUnitId },
        select: ['id'],
      });
      listOrgUnitIds.push(...childOrgUnits.map((ou) => ou.id));

      whereItem.orgUnitId = In(listOrgUnitIds);
    }
    if (positionId) whereItem.positionId = positionId;

    let where: FindOptionsWhere<JobTitle>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name'],
        search,
        whereItem,
      });

    const [list, total] = await this.jobTitleRepo.findAndCount({
      relations: { orgUnit: { parent: true }, position: true },
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });

    return { page, take, total, list };
  }

  async updateJobTitle(id: string, updateJobTitleDto: UpdateJobTitleDto, user: UserRequest) {
    const { name, orgUnitId } = updateJobTitleDto;

    const [existsJobTitle, conflictNameCode] = await Promise.all([
      this.jobTitleRepo.findOne({
        where: { id },
      }),
      this.jobTitleRepo.findOne({
        where: [{ name, orgUnit: { id: orgUnitId }, id: Not(id) }],
        select: ['id', 'name'],
        withDeleted: true,
      }),
    ]);

    this.jobTitleHandle.errorNotFoundEntityWithId(existsJobTitle, JobTitle.name, id);

    this.jobTitleHandle.errorConflictName(conflictNameCode, name);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(JobTitle, id, {
          ...updateJobTitleDto,
          updatedById: user.id,
        });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteJobTitle(id: string) {
    const existsJobTitle = await this.jobTitleRepo.findOne({
      where: { id },
    });

    this.jobTitleHandle.errorNotFoundEntityWithId(existsJobTitle, JobTitle.name, id);

    return await this.dataSource
      .transaction(async (manager) => {
        // Soft delete jobTitle
        await manager.softDelete(JobTitle, id);
        // Soft delete all jobTitles in this jobTitle
        // await manager.update(Job, { jobTitleId: id }, { name: null });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getJobTitle(id: string): Promise<JobTitle> {
    const jobTitle = await this.jobTitleRepo.findOne({
      relations: { orgUnit: { parent: true }, position: true },
      where: { id },
    });

    return jobTitle ?? this.jobTitleHandle.errorNotFoundJobTitle(id);
  }

  async getJobTitlesByUserOrgUnit(user: UserRequest) {
    const listManagerDepartmentIds = await this.orgUnitService
      .getManagedDepartmentsByUser(user)
      .then((list) => list.map((item) => item.id));

    if (listManagerDepartmentIds.length === 0) return [];

    const generalDirectorPositionId = await this.positionRepo.findOne({
      where: { name: 'Tổng giám đốc' },
      select: ['id'],
    });

    if (user.positionId === generalDirectorPositionId.id) {
      listManagerDepartmentIds.push(user.orgUnitId);
    }

    let isDivisionDirectorOrHR = await this.isDivisionDirectorOrHR(user);

    const baseSelect = {
      id: true,
      name: true,
      welfare: true,
      requirement: true,
      description: true,
      attachments: true,
      orgUnitId: true,
      positionId: true,
      position: {
        id: true,
        name: true,
        ...(isDivisionDirectorOrHR
          ? {
              salaryRangePositions: {
                id: true,
                salaryRange: {
                  minSalary: true,
                  maxSalary: true,
                },
              },
            }
          : {}),
      },
    };

    const baseRelations = {
      position: isDivisionDirectorOrHR
        ? { salaryRangePositions: { salaryRange: true } }
        : true,
    };

    const [list, total] = await this.jobTitleRepo.findAndCount({
      relations: baseRelations,
      where: { orgUnit: { id: In(listManagerDepartmentIds) } },
      select: baseSelect,
    });

    return { total, list };
  }

  async isDivisionDirectorOrHR(user?: UserRequest){
    if (!user) return false;
    if (user.type === UserType.HR || user.type === UserType.ADMIN)
      return true;
    const isDivisionManager = await this.orgUnitRepo.findOne({
      where: { type: OrgUnitType.DIVISION.toString() as unknown as OrgUnitType, managerId: user.id},
      select: ['id']
    })

    if (isDivisionManager) return true;

    return false;
  }

  async getWelfare(positionId: string, orgUnitId: string) {
    const [postion, orgUnit] = await Promise.all([
      this.positionRepo.findOne({
        where: {id: positionId},
        select: ['name']
      }),
      this.orgUnitRepo.findOne({
        relations: {parent: true},
        where: {id: orgUnitId},
        select: {id: true, name: true, type: true, parent: { name: true, type: true}}
      })
    ])

    if (postion && postion.name.toLocaleLowerCase().includes('thực tập'))
      return WELFARE_HTML.INTER;

    if (orgUnit.name.toLocaleLowerCase().includes('công nghệ số') || orgUnit.parent?.name.toLocaleLowerCase().includes('công nghệ số'))
      return WELFARE_HTML.CNS;

    return WELFARE_HTML.OTHER;
  }
}
