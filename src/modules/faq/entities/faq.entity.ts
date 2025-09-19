import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { FaqCategory, FaqStatus } from '../faq.enum';

@Entity()
export class Faq extends BaseEntity {
  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ default: 0 })
  order?: number;

  @Column({ type: 'enum', enum: FaqStatus, default: FaqStatus.ACTIVE })
  status: FaqStatus;

  @Column({ type: 'enum', enum: FaqCategory, default: FaqCategory.COMPANY})
  category: FaqCategory;
}
