import { BadRequestException, Injectable } from '@nestjs/common';
import { FaqFilter } from './interfaces/faq-filter.interface';
import { FindOptionsWhere } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { UpdateOrderFaqDto } from './dtos/update-many-order-faq.dto';

@Injectable()
export class FaqHandle {
  constructor() {}

  errorNotFoundEntityWithId<T>(entity: T | null | undefined, entityName: string, id: string): void {
    if (!entity) throw new BadRequestException(`${entityName} with id ${id} not found`);
  }

  buildWhereFaqFilter(whereItem: FindOptionsWhere<Faq>, filter: FaqFilter) {
    if (filter.status) whereItem.status = filter.status as Faq['status'];

    if (filter.category ) whereItem.category = filter.category as Faq['category']
  }

  errorDuplicateFaqs(faqs: UpdateOrderFaqDto[]): void {
    const orderSet = new Set<number>();
    const faqIdSet = new Set<string>();

    for (const faq of faqs) {
      // Kiểm tra order có bị trùng lặp không
      if (orderSet.has(faq.order)) throw new BadRequestException(`Order ${faq.order} bị trùng lặp`);

      orderSet.add(faq.order);

      // Kiểm tra faqId có bị trùng lặp không
      if (faqIdSet.has(faq.faqId)) throw new BadRequestException(`Id ${faq.faqId} bị trùng lặp`);

      faqIdSet.add(faq.faqId);
    }
  }

  errorQuantityFaq(faqs: UpdateOrderFaqDto[], countFaqs: number, existingFaqs: Faq[]): void {
    if (faqs.length !== countFaqs) throw new BadRequestException('Số lượng FAQ không hợp lệ');

    if (existingFaqs.length !== faqs.length)
      throw new BadRequestException('Một số FAQ không tồn tại');
  }
}
