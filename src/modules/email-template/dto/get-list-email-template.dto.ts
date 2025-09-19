import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { UpdateEmailTemplateDto } from './update-email-template.dto';

export class GetListEmailTemplateDto extends IntersectionType(
  PageOptionsDto,
  PartialType(PickType(UpdateEmailTemplateDto, ['status'])),
) {}
