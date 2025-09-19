import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomGroupController } from './controllers/room-group.controller';
import { RoomGroupService } from './services/room-group.service';
import { RoomGroup } from './entities/room-group.entity';
import { UserModule } from '../user/user.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { RoomController } from './controllers/room.controller';
import { RoomService } from './services/room.service';
import { Room } from './entities/room.entity';
import { RoomPurposeService } from './services/room-purpose.service';
import { RoomPurpose } from './entities/room-purpose.entity';
import { RoomPurposeController } from './controllers/room-purpose.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoomGroup, Room, RoomPurpose]), UserModule, OrgUnitModule],
  controllers: [RoomGroupController, RoomController, RoomPurposeController],
  providers: [RoomGroupService, RoomService, RoomPurposeService],
  exports: [RoomGroupService, RoomService, RoomPurposeService],
})
export class RoomModule {}
