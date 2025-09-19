import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { UpdateFaqDto } from './update-faq.dto';

export class GetListFaqDto extends IntersectionType(
  PageOptionsDto,
  PartialType(PickType(UpdateFaqDto, ['status', 'category'])),
) {}
