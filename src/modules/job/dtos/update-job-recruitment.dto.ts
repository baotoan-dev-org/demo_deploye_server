import { IntersectionType } from '@nestjs/swagger';
import { CreateJobRecruitmentDto } from './create-job-recruitment.dto';

export class UpdateJobRecruitmentDto extends IntersectionType(CreateJobRecruitmentDto) {}
