import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { JobHandle } from './job.handle';
import { JobController } from './controllers/job.controller';
import { JobService } from './services/job.service';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { PositionModule } from '../position/position.module';
import { IndustryModule } from '../industry/industry.module';
import { NotificationModule } from '../notification/notification.module';
import { JobRecruitmentService } from './services/job-recruitment.service';
import { JobRecruitmentController } from './controllers/job-recruitment.controller';
import { JobApprover } from './entities/job-approver.entity';
import { UserModule } from '../user/user.module';
import { PermissionModule } from '../permission/permission.module';
import { JobTitleModule } from '../job-title/job-title.module';
import { JobRequestGroup } from './entities/job-request-group.entity';
import { JobLog } from './entities/job-log.entity';
import { JobLogService } from './services/job-log.service';
import { ReadJDService } from './services/read-jd.service';
import { RecruitmentDashboardService } from './services/recruitment-dashboard.service';
import { RecruitmentDashboardController } from './controllers/recruitment-dashboard.controller';
import { ApplicationModule } from '../application/application.module';
import { Application } from '../application/entities/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobApprover, JobRequestGroup, JobLog, Application]),
    PositionModule,
    IndustryModule,
    NotificationModule,
    PermissionModule,
    JobTitleModule,
    forwardRef(() => OrgUnitModule),
    forwardRef(() => UserModule),
    forwardRef(() => ApplicationModule),
  ],
  controllers: [JobController, JobRecruitmentController, RecruitmentDashboardController],
  providers: [
    JobService,
    JobHandle,
    JobRecruitmentService,
    JobLogService,
    ReadJDService,
    RecruitmentDashboardService,
  ],
  exports: [JobService, JobRecruitmentService, JobHandle, TypeOrmModule, ReadJDService],
})
export class JobModule {}
