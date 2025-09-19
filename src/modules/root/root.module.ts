import { Module } from '@nestjs/common';
import { RootController } from './controllers/root.controller';
import { RootService } from './services/root.service';
import { RootHandle } from './root.handle';
import { UserModule } from '../user/user.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';
import { PositionModule } from '../position/position.module';

@Module({
  imports: [UserModule, OrgUnitModule, PositionModule],
  controllers: [RootController],
  providers: [RootService, RootHandle],
  exports: [RootService, RootHandle],
})
export class RootModule {}
