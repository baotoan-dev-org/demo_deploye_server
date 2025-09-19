import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Application } from '@/modules/application/entities/application.entity';
import { Repository } from 'typeorm';
import { Job } from '@/modules/job/entities/job.entity';

@Injectable()
export class StatisticalAnalysisService {
  constructor(
    @InjectRepository(Application)
    private applicationRepo: Repository<Application>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
  ) {}
}
