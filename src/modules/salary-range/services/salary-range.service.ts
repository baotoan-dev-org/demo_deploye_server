import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, DeepPartial, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { v4 as uuidv4 } from 'uuid';
import { SalaryRangePosition } from '../entities/salary-range-position.entity';
import { CreateSalaryRangeDto } from '../dtos/create-salary-range.dto';
import { GetListSalaryRangeDto } from '../dtos/get-list-salary-range.dto';
import { SalaryRange } from '../entities/salary-range.entity';
import { UpdateSalaryRangeDto } from '../dtos/update-salary-range.dto';
import { JobTitleService } from '@/modules/job-title/services/job-title.service';
import { UserType } from '@/modules/user/user.enum';

@Injectable()
export class SalaryRangeService {
  constructor(
    private dataSource: DataSource,

    private jobTitleService: JobTitleService,

    @InjectRepository(SalaryRangePosition)
    private salaryRangePositionRepo: Repository<SalaryRangePosition>,

    @InjectRepository(SalaryRange)
    private salaryRangeRepo: Repository<SalaryRange>,

  ) {}

  async createSalaryRangePosition(createSalaryRangeDto: CreateSalaryRangeDto, user: UserRequest){
    const isDivisionDirectorOrHR = await this.jobTitleService.isDivisionDirectorOrHR(user);

    if ( user.type !== UserType.ADMIN && user.type !== UserType.HR && !isDivisionDirectorOrHR ){
      throw new ForbiddenException('Bạn không có quyền truy cập!')
    }

    const { minSalary, maxSalary, positionIds } = createSalaryRangeDto;

    const conflict = await this.salaryRangeRepo.findOne({
      where: { minSalary, maxSalary}
    })

    if (conflict) throw new ConflictException(`Khung lương: ${minSalary} - ${maxSalary} đã tồn tại`);

    return await this.dataSource.transaction(async (manager) => {

      // 1. Insert salary_range
      const salaryRange = manager.create(SalaryRange, {
        id: uuidv4(),
        minSalary,
        maxSalary,
        createdById: user.id,
      });

      await manager.insert(SalaryRange, salaryRange);

      // 2. Check conflict cho tất cả positionIds
      const conflicts = await manager.find(SalaryRangePosition, {
        relations: {position: true},
        where: positionIds.map((pid) => ({
          positionId: pid,
        })),
        select: { positionId: true, position: {name: true}}
      });

      if (conflicts.length > 0) {
        const conflictIds = conflicts.map((c) => c.position.name).join(', ');
        throw new ConflictException(
          `Đã tồn tại khung lương cho chức vụ: ${conflictIds}!`,
        );
      }

      const insertData: DeepPartial<SalaryRangePosition>[] = positionIds.map(
        (pid) => ({
          id: uuidv4(),
          salaryRangeId: salaryRange.id,
          positionId: pid,
          createdById: user.id,
        }),
      );

      await manager.insert(SalaryRangePosition, insertData);

      return { success: true };
    }).catch((err) => {
      throw new BadRequestException({ message: err.message, code: err.code, success: false, });
    });
  }

  async getListSalaryRangePosition(getListSalaryRangeDto: GetListSalaryRangeDto, user: UserRequest) {

    const isDivisionDirectorOrHR = await this.jobTitleService.isDivisionDirectorOrHR(user);

    if ( user.type !== UserType.ADMIN && user.type !== UserType.HR && !isDivisionDirectorOrHR ){
      throw new ForbiddenException('Bạn không có quyền truy cập!')
    }

    let { page, take, orderBy, order, search } = getListSalaryRangeDto;

    const qb = this.salaryRangeRepo
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.salaryRangePositions', 'srp')
      .leftJoinAndSelect('srp.position', 'p');

    // search theo position name hoặc min/max salary
    if (search) {
      qb.andWhere(
        '(p.name LIKE :search OR sr.minSalary LIKE :search OR sr.maxSalary LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // order
    if (orderBy) {
      qb.addOrderBy(`sr.${orderBy}`, order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
    } else {
      qb.addOrderBy('sr.createdAt', 'DESC');
    }

    // pagination
    qb.skip((page - 1) * take).take(take);

    const [result, total] = await qb.getManyAndCount();

    const list = result.map((sr) => ({
      id: sr.id,
      minSalary: sr.minSalary,
      maxSalary: sr.maxSalary,
      positions: sr.salaryRangePositions.map((srp) => ({
        id: srp.position.id,
        name: srp.position.name,
      })),
    }));

    return { total, list };
  }

  async updateSalaryRange(
    id: string,
    updateDto: UpdateSalaryRangeDto,
    user: UserRequest,
  ) {
    const isDivisionDirectorOrHR = await this.jobTitleService.isDivisionDirectorOrHR(user);

    if ( user.type !== UserType.ADMIN && user.type !== UserType.HR && !isDivisionDirectorOrHR ){
      throw new ForbiddenException('Bạn không có quyền truy cập!')
    }

    const { minSalary, maxSalary, positionIds } = updateDto;

    return await this.dataSource.transaction(async (manager) => {
      // 1. Tìm salary range cũ
      const salaryRange = await manager.findOne(SalaryRange, {
        where: { id },
        // relations: ['salaryRangePositions'],
      });

      if (!salaryRange) {
        throw new NotFoundException(`SalaryRange ${id} không tồn tại`);
      }

      // 2. Check conflict salary range (khác id hiện tại)
      const conflict = await manager.findOne(SalaryRange, {
        where: { minSalary, maxSalary, id: Not(id) },
      });

      if (conflict) {
        throw new ConflictException(
          `Khung lương ${minSalary} - ${maxSalary} đã tồn tại`,
        );
      }

      // 3. Update salary range
      await manager.update(
        SalaryRange,
        { id },
        {
          minSalary,
          maxSalary,
          updatedById: user.id,
        },
      );

      // 4. Xóa hết mapping positions cũ
      await manager.delete(SalaryRangePosition, { salaryRangeId: id });

      // 5. Insert lại mapping positions mới
      if (positionIds?.length) {
        const insertData = positionIds.map((pid) => ({
          id: uuidv4(),
          salaryRangeId: id,
          positionId: pid,
          createdById: user.id,
        }));

        await manager.insert(SalaryRangePosition, insertData);
      }

      return { success: true };
    });
  }

  async deleteSalaryRange(id: string, user: UserRequest){
    const isDivisionDirectorOrHR = await this.jobTitleService.isDivisionDirectorOrHR(user);

    if ( user.type !== UserType.ADMIN && user.type !== UserType.HR && !isDivisionDirectorOrHR ){
      throw new ForbiddenException('Bạn không có quyền truy cập!')
    }

    const salaryRange = await this.salaryRangeRepo.findOne({
      where: { id },
    });

    if (!salaryRange) throw new NotFoundException(`SalaryRange với id=${id} không tồn tại`);

    return await this.dataSource.transaction(async (manager) => {
      await manager.delete(SalaryRange, id);
      return { success: true };
    }).catch((err) => {
      throw new BadRequestException({
        message: err.message,
        code: err.code,
        success: false,
      });
    });
  }

  async getSalaryRange(id: string, user: UserRequest){
    const isDivisionDirectorOrHR = await this.jobTitleService.isDivisionDirectorOrHR(user);

    if ( user.type !== UserType.ADMIN && user.type !== UserType.HR && !isDivisionDirectorOrHR ){
      throw new ForbiddenException('Bạn không có quyền truy cập!')
    }

    const salaryRange = await this.salaryRangeRepo.findOne({
      where: { id },
      relations: [
        'salaryRangePositions',
        'salaryRangePositions.position',
      ],
    });

    if (!salaryRange) {
      throw new NotFoundException(`SalaryRange ${id} không tồn tại`);
    }

    return {
      id: salaryRange.id,
      minSalary: salaryRange.minSalary,
      maxSalary: salaryRange.maxSalary,
      positions: salaryRange.salaryRangePositions.map((srp) => ({
        id: srp.position.id,
        name: srp.position.name
      })),
    };
  }

}

