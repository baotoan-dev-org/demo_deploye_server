import { OmitType } from '@nestjs/mapped-types';
import { Job } from '../entities/job.entity';

export class JobResponseDto extends OmitType(Job, [] as const) {
  url: string;
  listSimilarJobs: JobResponseDto[];
}