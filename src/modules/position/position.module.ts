import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionController } from './controllers/position.controller';
import { Position } from './entities/position.entity';
import { PositionHandle } from './position.handle';
import { PositionService } from './services/position.service';
import { UserModule } from '../user/user.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position]),
    forwardRef(() => UserModule),
    forwardRef(() => OrgUnitModule),
    forwardRef(() => KafkaModule),
  ],
  controllers: [PositionController],
  providers: [PositionService, PositionHandle],
  exports: [PositionService, PositionHandle, TypeOrmModule],
})
export class PositionModule {}
