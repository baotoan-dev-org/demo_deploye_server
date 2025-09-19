import { QueryService } from '@/common/services/query.service';
import { Job } from '@/modules/job/entities/job.entity';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { DataSource, DeepPartial, FindOptionsWhere, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateIndustryDto } from '../dtos/create-industry.dto';
import { GetListIndustryDto } from '../dtos/get-list-industry.dto';
import { UpdateIndustryDto } from '../dtos/update-industry.dto';
import { Industry } from '../entities/industry.entity';
import { IndustryHandle } from '../industry.handle';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Injectable()
export class IndustryService {
  constructor(
    private dataSource: DataSource,

    private industryHandle: IndustryHandle,

    private queryService: QueryService,

    @InjectRepository(Industry)
    private industryRepo: Repository<Industry>,
  ) {}

  async createIndustry(createIndustryDto: CreateIndustryDto, user: UserRequest) {
    const { name } = createIndustryDto;

    const conflict = await this.industryRepo.findOne({
      where: [{ name }],
      select: ['name'],
    });

    this.industryHandle.errorConflictName(conflict, name);

    const industryInsert: DeepPartial<Industry> = {
      ...createIndustryDto,
      id: uuidv4(),
      createdById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(Industry, industryInsert);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListIndustry(getListIndustryDto: GetListIndustryDto) {
    let { page, take, orderBy, order, search, status } = getListIndustryDto;

    const whereItem: FindOptionsWhere<Industry> = {};
    if (status) whereItem.status = status;

    let where: FindOptionsWhere<Industry>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name'],
        search,
        whereItem,
      });

    const [list, total] = await this.industryRepo.findAndCount({
      relations: ['jobs', 'jobs.industry'],
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });

    return { page, take, total, list };
  }

  async updateIndustry(id: string, updateIndustryDto: UpdateIndustryDto, user: UserRequest) {
    const { name } = updateIndustryDto;

    const [existsIndustry, conflictNameCode] = await Promise.all([
      this.industryRepo.findOne({
        where: { id },
      }),
      this.industryRepo.findOne({
        where: [{ name, id: Not(id) }],
        select: ['name'],
        withDeleted: true,
      }),
    ]);

    this.industryHandle.errorNotFoundEntityWithId(existsIndustry, Industry.name, id);

    this.industryHandle.errorConflictName(conflictNameCode, name);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(Industry, id, {
          ...updateIndustryDto,
          updatedById: user.id,
        });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteIndustry(id: string) {
    const existsIndustry = await this.industryRepo.findOne({
      where: { id },
    });

    this.industryHandle.errorNotFoundEntityWithId(existsIndustry, Industry.name, id);

    return await this.dataSource
      .transaction(async (manager) => {
        // Soft delete industry
        await manager.softDelete(Industry, id);
        // Soft delete all industrys in this industry
        await manager.update(Job, { industryId: id }, { industryId: null });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getIndustry(idOrCode: string): Promise<Industry> {
    const where = isUUID(idOrCode) ? { id: idOrCode } : { code: idOrCode };

    const industry = await this.industryRepo.findOne({
      // relations: ['jobs'],
      where,
    });

    return industry ?? this.industryHandle.errorNotFoundIndustry(idOrCode);
  }
}
