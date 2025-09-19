import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { User } from './entities/user.entity';
import { UserHandle } from './user.handle';
import { NotificationModule } from '../notification/notification.module';
import { UserOrgUnitPosition } from './entities/user-unit-position.entity';
import { UserMovementApprover } from './entities/user-movement-approve.entity';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { Position } from '../position/entities/position.entity';
import { UserMovement } from './entities/user-movement.entity';
import { UserMovementService } from './services/user-movement.service';
import { UserMovementController } from './controllers/user-movement.controller';
import { UserMovementNotify } from './entities/user-movement-notify.entity';
import { SubManager } from './entities/sub-manager.entity';
import { UserTracking } from './entities/user-tracking';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserOrgUnitPosition,
      UserMovement,
      UserMovementApprover,
      Position,
      UserMovementNotify,
      SubManager,
      UserTracking,
    ]),
    NotificationModule,
    forwardRef(() => OrgUnitModule),
    forwardRef(() => KafkaModule),
  ],
  controllers: [UserController, UserMovementController],
  providers: [UserService, UserMovementService, UserHandle],
  exports: [UserService, UserHandle, TypeOrmModule, UserMovementService],
})
export class UserModule {}
