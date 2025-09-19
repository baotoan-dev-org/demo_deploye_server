import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, FindOptionsWhere, In, Repository } from 'typeorm';
import { QueryService } from '@/common/services/query.service';
import { CreateFaqDto } from '../dtos/create-faq.dto';
import { Faq } from '../entities/faq.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { GetListFaqDto } from '../dtos/get-list-faq.dto';
import { UpdateFaqDto } from '../dtos/update-faq.dto';
import { FaqHandle } from '../faq.handle';
import { UpdateManyOrderFaqDto } from '../dtos/update-many-order-faq.dto';
import { UserType } from '@/modules/user/user.enum';
import { v4 as uuidv4 } from 'uuid';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Injectable()
export class FaqService {
  constructor(
    private dataSource: DataSource,

    private queryService: QueryService,

    private faqHandle: FaqHandle,

    @InjectRepository(Faq)
    private faqRepo: Repository<Faq>,
  ) {}

  async createFaq(createFaqDto: CreateFaqDto, user: UserRequest) {
    const { order } = createFaqDto;

    return await this.dataSource
      .transaction(async (manager) => {
        let faqOrder = order;

        // Nếu không truyền order thì lấy lớn nhất + 1
        if (faqOrder === undefined || faqOrder === null) {
          const maxOrderFaq = await manager
            .createQueryBuilder(Faq, 'faq')
            .orderBy('faq.order', 'DESC')
            .getOne();
          faqOrder = maxOrderFaq ? maxOrderFaq.order + 1 : 1;
        } else {
          // Nếu truyền order, phải tăng order các bản ghi >= order này lên 1
          await manager
            .createQueryBuilder()
            .update(Faq)
            .set({ order: () => '`order` + 1' })
            .where('`order` >= :order', { order: faqOrder })
            .execute();
        }

        const faqInsert: DeepPartial<Faq> = {
          ...createFaqDto,
          id: uuidv4(),
          createdById: user.id,
          order: faqOrder,
        };

        await manager.insert(Faq, faqInsert);
        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListFaq(getListFaqDto: GetListFaqDto, user: UserRequest) {
    const { take, page, orderBy, order, search, status, category } = getListFaqDto;

    if ((!user || ![UserType.ADMIN, UserType.ROOT].includes(user.type)) && take === 0) {
      throw new BadRequestException('You do not have permission to access this resource');
    }

    const whereItem: FindOptionsWhere<Faq> = { status, category };

    this.faqHandle.buildWhereFaqFilter(whereItem, { status, category });

    let where: FindOptionsWhere<Faq>[] = [whereItem];

    if (search) {
      where = this.queryService.search({
        arrayPropertyLike: ['question', 'answer'],
        search,
        whereItem,
      });
    }

    const isGetAll = take === 0;

    const pagination = isGetAll ? {} : this.queryService.getPagination({ page, take });

    const [list, total] = await this.faqRepo.findAndCount({
      where,
      ...pagination,
      order: { [orderBy]: order },
    });

    return {
      page: isGetAll ? 1 : page,
      take: isGetAll ? total : take,
      total,
      list,
    };
  }

  async getFaq(id: string) {
    const company = await this.faqRepo.findOne({
      where: { id },
    });

    return company ?? this.faqHandle.errorNotFoundEntityWithId(company, Faq.name, id);
  }

  async updateFaq(id: string, updateFaqDto: UpdateFaqDto, user: UserRequest) {
    const { order } = updateFaqDto;

    const faq = await this.faqRepo.findOne({ where: { id } });

    this.faqHandle.errorNotFoundEntityWithId(faq, Faq.name, id);

    try {
      await this.dataSource.transaction(async (manager) => {
        // Xử lý cập nhật order nếu có truyền order mới
        if (order !== undefined && order !== faq.order) {
          if (order < faq.order) {
            await manager
              .createQueryBuilder()
              .update(Faq)
              .set({ order: () => '`order` + 1' })
              .where('`order` >= :newOrder AND `order` < :oldOrder', {
                newOrder: order,
                oldOrder: faq.order,
              })
              .execute();
          } else {
            await manager
              .createQueryBuilder()
              .update(Faq)
              .set({ order: () => '`order` - 1' })
              .where('`order` > :oldOrder AND `order` <= :newOrder', {
                oldOrder: faq.order,
                newOrder: order,
              })
              .execute();
          }
        }

        await manager.update(Faq, id, {
          ...updateFaqDto,
          updatedById: user.id,
          order: order !== undefined ? order : faq.order,
        });
      });
      return { success: true };
    } catch (err) {
      throw new BadRequestException({
        message: err.message,
        code: err.code,
        success: false,
      });
    }
  }

  async deleteFaq(id: string) {
    const faq = await this.faqRepo.findOne({ where: { id } });
    this.faqHandle.errorNotFoundEntityWithId(faq, Faq.name, id);

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(Faq, id);
        await manager
          .createQueryBuilder()
          .update(Faq)
          .set({ order: () => '`order` - 1' })
          .where('`order` > :order', { order: faq.order })
          .execute();
      });
      return { success: true };
    } catch (err) {
      throw new BadRequestException({
        message: err.message,
        code: err.code,
        success: false,
      });
    }
  }

  async updateManyOrderFaq(updateManyOrderFaqDto: UpdateManyOrderFaqDto, user: UserRequest) {
    const { faqs } = updateManyOrderFaqDto;

    this.faqHandle.errorDuplicateFaqs(faqs);

    const [existingFaqs, countFaqs] = await Promise.all([
      this.faqRepo.find({
        where: { id: In(faqs.map((faq) => faq.faqId)) },
      }),
      this.faqRepo.count(),
    ]);

    this.faqHandle.errorQuantityFaq(faqs, countFaqs, existingFaqs);

    const updateFaqs: DeepPartial<Faq>[] = faqs.map((faq) => ({
      id: faq.faqId,
      order: faq.order,
      updatedById: user.id,
    }));

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.save(Faq, updateFaqs);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListFaqGroupByCategory() {

    const faqs = await this.faqRepo.find({
      order: { order: 'ASC'}
    })

    const category = faqs.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, Faq[]>);

    return category;
  }
}
