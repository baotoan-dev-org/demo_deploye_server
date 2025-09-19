import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalController } from './controllers/proposal.controller';
import { ProposalService } from './services/proposal.service';
import { UserModule } from '../user/user.module';
import { ProjectTaskModule } from '../project-task/project-task.module';
import { NotificationModule } from '../notification/notification.module';
import { JobModule } from '../job/job.module';
@Module({
  imports: [TypeOrmModule.forFeature([]), UserModule, ProjectTaskModule, NotificationModule, JobModule],
  controllers: [ProposalController],
  providers: [ProposalService],
  exports: [TypeOrmModule],
})
export class ProposalModule {}
