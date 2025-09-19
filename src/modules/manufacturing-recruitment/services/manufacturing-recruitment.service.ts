import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { QueryService } from 'src/common/services/query.service';
import { ManufacturingRecruitment } from '../entities/manufacturing-recruitment.entity';
import { CreateManufacturingRecruitmentDto } from '../dtos/create-manufacturing-recruitment.dto';
import { v4 as uuidv4 } from 'uuid';
import { ManufactBanner } from '../entities/manufact-banner.entity';
import { ManufactBannerStatus, ManufacturingRecruitmentStatus } from '../manufacturing-recruitment.enum';
import { GetListManufacturingRecruitmentDto } from '../dtos/get-manufacturing-recruitment.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { UpdateManufacturingRecruitmentDto } from '../dtos/update-manufacturing-recruitment.dto';


@Injectable()
export class ManufacturingRecruitmentService {
  constructor(
    private dataSource: DataSource,

    private queryService: QueryService,

    @InjectRepository(ManufacturingRecruitment)
    private manufactRepo: Repository<ManufacturingRecruitment>,

    @InjectRepository(ManufactBanner)
    private mufactBannerRepo: Repository<ManufactBanner>
  ) {}

  async createManufacturingRecruitment(createManufacturingRecruitmentDto: CreateManufacturingRecruitmentDto){
    const { name, phone } = createManufacturingRecruitmentDto;
    
    const [conflict, bannerActive] = await Promise.all([
      this.manufactRepo.findOne({
        where: [{ name, phone }],
      }),

      this.mufactBannerRepo.findOne({
        where: {status: ManufactBannerStatus.ACTIVE},
        select: ['id']
      })
    ])

    if (conflict) throw new BadRequestException('Bạn đã ứng tuyển công việc này');

    // if (!bannerActive) throw new BadRequestException('Không có chương trình tuyển dụng');

    
    const dataInsert: DeepPartial<ManufacturingRecruitment> = {
        ...createManufacturingRecruitmentDto,
        bannerId: bannerActive ? bannerActive.id : null,
        id: uuidv4()
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(ManufacturingRecruitment, dataInsert);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
      throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListManufacturingRecruitment(getListManufacturingRecruitmentDto: GetListManufacturingRecruitmentDto) {
    const { page, take, orderBy, order, search, bannerId, status } = getListManufacturingRecruitmentDto;
    let whereItem: FindOptionsWhere<ManufacturingRecruitment> = {};

    if (status) whereItem.status = status;

    if (bannerId) whereItem.bannerId = bannerId;
    
    let where: FindOptionsWhere<ManufacturingRecruitment>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name' , 'address'],
        search,
        whereItem,
      });

    const [list, total] = await this.manufactRepo.findAndCount({
      where,
      relations: { banner: true, referrer: true  },
      select: {
        banner: { id: true, name: true },
        referrer: { id: true, name: true, phone: true, url: true, code: true}
      },
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });

    return { total, list };
  }

  async updateManufacturingRecruitment(id: string, updateManufacturingRecruitmentDto: UpdateManufacturingRecruitmentDto, user: UserRequest){
    const exists = await this.manufactRepo.findOne({ where: { id }});

    const { status } = updateManufacturingRecruitmentDto;

    if(!exists) throw new NotFoundException('Dữ liệu không tồn tại');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(ManufacturingRecruitment, id, {
          status,
          rejectReason: [ManufacturingRecruitmentStatus.NOT_QUALIFIED, ManufacturingRecruitmentStatus.REJECTED, ManufacturingRecruitmentStatus.THANK_LETTER].includes(status)  ? updateManufacturingRecruitmentDto.rejectReason : null,
          updatedById: user.id,
        });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });

  }
}
