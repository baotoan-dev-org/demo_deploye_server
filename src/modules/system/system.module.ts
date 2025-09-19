import { Module } from '@nestjs/common';
import { SystemHandle } from './system.handle';
import { SystemController } from './controllers/system.controller';
import { SystemService } from './services/system.service';
import { JobModule } from '../job/job.module';
import { UserModule } from '../user/user.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { ProjectTaskModule } from '../project-task/project-task.module';

@Module({
  imports: [JobModule, UserModule, OrgUnitModule, ProjectTaskModule],
  controllers: [SystemController],
  providers: [SystemService, SystemHandle],
  exports: [SystemService, SystemHandle],
})
export class SystemModule {}
