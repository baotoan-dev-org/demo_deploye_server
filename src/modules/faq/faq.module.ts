import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqController } from './controllers/faq.controller';
import { FaqService } from './services/faq.service';
import { Faq } from './entities/faq.entity';
import { FaqHandle } from './faq.handle';
import { User } from '../user/entities/user.entity';
import { Job } from '../job/entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Faq, User, Job])],
  controllers: [FaqController],
  providers: [FaqService, FaqHandle],
  exports: [FaqService, FaqHandle, TypeOrmModule],
})
export class FaqModule {}
