import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';

export class GetListDiscussionDto extends IntersectionType(PageOptionsDto) {}
