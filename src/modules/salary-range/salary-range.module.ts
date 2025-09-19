import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { SalaryRangeController } from './controllers/salary-range.controller';
import { SalaryRangePosition } from './entities/salary-range-position.entity';
import { SalaryRangeService } from './services/salary-range.service';
import { SalaryRange } from './entities/salary-range.entity';
import { JobTitleModule } from '../job-title/job-title.module';
@Module({
  imports: [TypeOrmModule.forFeature([SalaryRangePosition, SalaryRange, User]), JobTitleModule],
  controllers: [SalaryRangeController],
  providers: [SalaryRangeService,],
  exports: [SalaryRangeService, TypeOrmModule],
})
export class SalaryRangeModule {}
