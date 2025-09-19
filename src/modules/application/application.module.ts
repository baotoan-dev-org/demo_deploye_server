import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './controllers/application.controller';
import { ApplicationService } from './services/application.service';
import { Application } from './entities/application.entity';
import { ApplicationHandle } from './application.handle';
import { NotificationService } from '../notification/services/notification.service';
import { UserModule } from '../user/user.module';
import { JobModule } from '../job/job.module';
import { NotificationModule } from '../notification/notification.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { EmailTemplateModule } from '../email-template/email-template.module';
import { ApplicationHistory } from './entities/application-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ApplicationHistory]),
    NotificationModule,
    EmailTemplateModule,
    forwardRef(() => UserModule),
    forwardRef(() => OrgUnitModule),
    forwardRef(() => JobModule),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationHandle, NotificationService],
  exports: [ApplicationService, ApplicationHandle, TypeOrmModule, NotificationService],
})
export class ApplicationModule {}
