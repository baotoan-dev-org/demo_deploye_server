import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectTaskHandle } from './project-task.handle';
import { ProjectTaskController } from './controllers/project-task.controller';
import { ProjectTaskService } from './service/project-task.service';
import { ProjectTaskAssignee } from './entities/project-task-assignee.entity';
import { ProjectTaskAssigneeService } from './service/project-task-assignee.service';
import { OtherService } from '../other/services/other.service';
import { ProjectTaskReport } from './entities/project-task-report.entity';
import { ProjectTaskDependencyService } from './service/project-task-dependency.service';
import { ProjectTaskDependency } from './entities/project-task-dependency.entity';
import { OrgUnit } from '../org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from '../user/entities/user-unit-position.entity';
import { ProjectTaskHistoryService } from './service/project-task-history.service';
import { ProjectTaskHistory } from './entities/project-task-history.entity';
import { UserModule } from '../user/user.module';
import { ProjectTaskDashboardController } from './controllers/project-task-dashboard.controller';
import { ProjectTaskDashboardService } from './service/project-task-dashboard.service';
import { NotificationModule } from '../notification/notification.module';
import { OrgUnitDivisionDepartment } from '../org-unit/entities/org-unit-division-department.entity';
import { FileModule } from '../file/file.module';
import { ProjectTaskImportService } from './service/project-task-import.service';
import { ProjectTaskProposal } from './entities/project-task-proposal.entity';
import { ProjectTaskProposalApprover } from './entities/project-task-proposal-approver.entity';
import { ProjectTaskProposalFollower } from './entities/project-task-proposal-follower.entity';
import { ProjectTaskProposalController } from './controllers/project-task-proposal.controller';
import { ProjectTaskProposalService } from './service/project-task-proposal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrgUnit,
      OrgUnitDivisionDepartment,
      UserOrgUnitPosition,
      ProjectTask,
      ProjectTaskAssignee,
      ProjectTaskReport,
      ProjectTaskHistory,
      ProjectTaskDependency,
      ProjectTaskProposal,
      ProjectTaskProposalApprover,
      ProjectTaskProposalFollower,
    ]),
    NotificationModule,
    forwardRef(() => UserModule),
    forwardRef(() => FileModule),
  ],
  controllers: [
    ProjectTaskController,
    ProjectTaskDashboardController,
    ProjectTaskProposalController,
  ],
  providers: [
    OtherService,
    ProjectTaskHandle,
    ProjectTaskService,
    ProjectTaskAssigneeService,
    ProjectTaskDependencyService,
    ProjectTaskHistoryService,
    ProjectTaskDashboardService,
    ProjectTaskImportService,
    ProjectTaskProposalService,
  ],
  exports: [
    OtherService,
    ProjectTaskHandle,
    ProjectTaskService,
    ProjectTaskAssigneeService,
    ProjectTaskDependencyService,
    ProjectTaskHistoryService,
    ProjectTaskDashboardService,
    ProjectTaskImportService,
    ProjectTaskProposalService,
    TypeOrmModule,
  ],
})
export class ProjectTaskModule {}
