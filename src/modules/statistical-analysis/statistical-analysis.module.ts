import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticalAnalysisService } from './services/statistical-analysis.service';
import { StatisticalAnalysisController } from './controllers/statistical-analysis.controller';
import { Application } from '../application/entities/application.entity';
import { Job } from '../job/entities/job.entity';
import { User } from '../user/entities/user.entity';
import { ApprovalCountController } from './controllers/approval-count.controller';
import { ApprovalCountService } from './services/approval-count.service';
import { UserMovementApprover } from '../user/entities/user-movement-approve.entity';
import { JobApprover } from '../job/entities/job-approver.entity';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { ProjectTaskProposalApprover } from '../project-task/entities/project-task-proposal-approver.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      Job,
      User,
      ProjectTaskProposalApprover,
      UserMovementApprover,
      JobApprover,
    ]),
    OrgUnitModule,
  ],
  controllers: [StatisticalAnalysisController, ApprovalCountController],
  providers: [StatisticalAnalysisService, ApprovalCountService],
  exports: [TypeOrmModule],
})
export class DashBoardModule {}
