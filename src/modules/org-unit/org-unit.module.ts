import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgUnitController } from './controllers/org-unit.controller';
import { OrgUnitService } from './services/org-unit.service';
import { OrgUnitHandle } from './org-unit.handle';
import { OrgUnit } from './entities/org-unit.entity';
import { UserModule } from '../user/user.module';
import { PositionModule } from '../position/position.module';
import { ProjectTaskAssignee } from '../project-task/entities/project-task-assignee.entity';
import { OrgUnitDivisionDepartment } from './entities/org-unit-division-department.entity';
import { KafkaModule } from '../kafka/kafka.module';
import { ProjectTaskModule } from '../project-task/project-task.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgUnit, ProjectTaskAssignee, OrgUnitDivisionDepartment]),
    forwardRef(() => UserModule),
    forwardRef(() => KafkaModule),
    forwardRef(() => ProjectTaskModule),
    forwardRef(() => SocketModule),
    PositionModule,
  ],
  controllers: [OrgUnitController],
  providers: [OrgUnitService, OrgUnitHandle],
  exports: [OrgUnitService, OrgUnitHandle, TypeOrmModule],
})
export class OrgUnitModule {}
