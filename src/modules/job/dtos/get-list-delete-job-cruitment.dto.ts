import { PageOptionsDto } from "@/common/dtos/page-options.dto";
import { IntersectionType } from "@nestjs/swagger";

export class GetListDeleteJobRecruitmentDto extends IntersectionType(PageOptionsDto) {}