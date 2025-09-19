import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';

export class GetListProjectTaskDelayReasonDto extends IntersectionType(
  PartialType(PickType(PageOptionsDto, ['search'])),
) {}
