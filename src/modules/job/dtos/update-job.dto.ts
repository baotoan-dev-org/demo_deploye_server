import { IntersectionType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';

export class UpdateJobDto extends IntersectionType(CreateJobDto) {}
