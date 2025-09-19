import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, DeepPartial, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { QueryService } from 'src/common/services/query.service';
import { CreateManufactBannerDto } from '../dtos/create-manufact-banner.dto';
import { v4 as uuidv4 } from 'uuid';
import { ManufactBanner } from '../entities/manufact-banner.entity';
import { GetListManufactBannerDto } from '../dtos/get-manufact-banner.dto';
import { UpdateManufactBannerDto } from '../dtos/update-manufact-banner.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { UpdateStatusBannerDto } from '../dtos/update-status-banner.dto';
import { DeleteBannerDto } from '../dtos/delete-banner.dto';
import * as dayjs from 'dayjs';


@Injectable()
export class ManufactBannerService {
  constructor(
    private dataSource: DataSource,

    private queryService: QueryService,

    @InjectRepository(ManufactBanner)
    private manufactBannerRepo: Repository<ManufactBanner>
  ) {}

  async createManufactBanner(createManufactBannerDto: CreateManufactBannerDto){
    
    const { startDate, endDate } = createManufactBannerDto;

    if (endDate < startDate)  throw new BadRequestException('Ngày kết thúc phải sau Ngày áp dụng!');

    const conflictTime = await this.manufactBannerRepo.findOne({
      where: { 
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate)
      },
    })

    if (conflictTime ) throw new BadRequestException(`Đang tồn tại một chương trình tuyển dụng trong thời gian ${dayjs(startDate).format('DD/MM/YYYY')} - ${dayjs(endDate).format('DD/MM/YYYY')} `);
    
    const dataInsert: DeepPartial<ManufactBanner> = {
        ...createManufactBannerDto,
        id: uuidv4()
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(ManufactBanner, dataInsert);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
      throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListManufactBanner(getListManufactBannerDto: GetListManufactBannerDto) {
    const { page, take, orderBy, order, search, fromDate, toDate } = getListManufactBannerDto;
    let whereItem: FindOptionsWhere<ManufactBanner> = {};

    let where: FindOptionsWhere<ManufactBanner>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name' ],
        search,
        whereItem,
      });
    
    if (fromDate && toDate) {
      where = where.map((w) => ({
        ...w,
        startDate: Between(new Date(fromDate), new Date(toDate)), 
      }));
    } else if (fromDate) {
      where = where.map((w) => ({
        ...w,
        startDate: MoreThanOrEqual(new Date(fromDate)),
      }));
    } else if (toDate) {
      where = where.map((w) => ({
        ...w,
        startDate: LessThanOrEqual(new Date(toDate)),
      }));
    }

    const [list, total] = await this.manufactBannerRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
      order: {endDate: 'DESC'},
    });

    return { total, list };
  }

  async updateManufactBanner(id: string, updateManufactBannerDto: UpdateManufactBannerDto, user: UserRequest) {

    const { startDate, endDate } = updateManufactBannerDto;

    const [existsBanner, exitsTime] = await Promise.all([
      this.manufactBannerRepo.findOne({
        where: { id },
      }),
      this.manufactBannerRepo.findOne({
        where: { 
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
          id: Not(id)
        },
      })
    ]);

    if (!existsBanner) throw new BadRequestException('Không tìm thấy chương trình tuyển dụng');
   // if (conflictNameCode) throw new BadRequestException(`Tên chương trình tuyển dụng "${name}" đã tồn tại`);
    if (exitsTime) throw new BadRequestException(`Đang tồn tại một chương trình tuyển dụng trong thời gian ${dayjs(startDate).format('DD/MM/YYYY')} - ${dayjs(endDate).format('DD/MM/YYYY')} `);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(ManufactBanner, id, {
          ...updateManufactBannerDto,
          updatedById: user.id,
        });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteManufactBanner(id: string) {
    const existsManufactBanner = await this.manufactBannerRepo.findOne({
      where: { id },
    });

    if (!existsManufactBanner) throw new BadRequestException('Không tìm thấy chương trình tuyển dụng');
    return await this.dataSource
      .transaction(async (manager) => {
        await manager.softDelete(ManufactBanner, id);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getManufactBanner(id: string): Promise<ManufactBanner> {
    const manufactBanner = await this.manufactBannerRepo.findOne({
      where: { id },
    });
    if (!manufactBanner) throw new BadRequestException('Không tìm thấy chương trình tuyển dụng');

    return manufactBanner;
  }

  async updateStatusBanner(id: string, updateStatusBanner: UpdateStatusBannerDto, user: UserRequest){
    const manufactBanner = await this.manufactBannerRepo.findOne({
      where: {id},
      select: ['id', 'attachments']
    })

    if (!manufactBanner) throw new BadRequestException('Không tìm thấy chương trình tuyển dụng');

    const { index, status } = updateStatusBanner;

    if (manufactBanner.attachments.length > 0){
      manufactBanner.attachments[index].status = status;
    }
    else throw new BadRequestException('Attachments not found')

    await this.manufactBannerRepo.save(manufactBanner);
    return {success: true};
  }

  async getCurrentCampaignBanner(){  
    const now = new Date();

    let banner = await this.manufactBannerRepo
    .createQueryBuilder('b')
    .where('b.startDate <= :now', { now })
    .andWhere('b.endDate >= :now', { now })
    .orderBy('b.startDate', 'ASC')
    .getOne();

    if (banner) {
      return banner;
    }

    // Nếu không có, lấy cái gần nhất (startDate trong quá khứ)
    banner = await this.manufactBannerRepo
      .createQueryBuilder('b')
      .where('b.startDate < :now', { now })
      .orderBy('b.startDate', 'ASC')
      .getOne();

    return banner || null;
  }

  async deleteBanner(id: string, deleteBannerDto: DeleteBannerDto){
    const { index } = deleteBannerDto;
    const manufactBanner = await this.manufactBannerRepo.findOne({
      where: { id },
      select: ['id', 'attachments'],
    });

    if (!manufactBanner) throw new BadRequestException('Không tìm thấy chương trình tuyển dụng');

    if (manufactBanner.attachments.length > 0) manufactBanner.attachments.splice(index, 1);
    else throw new BadRequestException('Attachment not found');

    await this.manufactBannerRepo.save(manufactBanner);

    return { success: true };
  }
}
