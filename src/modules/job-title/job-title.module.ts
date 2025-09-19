import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobTitleController } from './controllers/job-title.controller';
import { JobTitle } from './entities/job-title.entity';
import { JobTitleHandle } from './job-title.handle';
import { JobTitleService } from './services/job-title.service';
import { UserModule } from '../user/user.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { PositionModule } from '../position/position.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobTitle]),
    PositionModule,
    forwardRef(() => UserModule),
    forwardRef(() => OrgUnitModule),
  ],
  controllers: [JobTitleController],
  providers: [JobTitleService, JobTitleHandle],
  exports: [JobTitleService, JobTitleHandle, TypeOrmModule],
})
export class JobTitleModule {}
