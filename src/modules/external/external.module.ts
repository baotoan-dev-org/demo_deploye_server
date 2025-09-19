import { forwardRef, Module } from '@nestjs/common';
import { ExternalHandle } from './external.handle';
import { ExternalController } from './controllers/external.controller';
import { ExternalService } from './services/external.service';
import { UserModule } from '../user/user.module';
import { PositionModule } from '../position/position.module';
import { OrgUnitModule } from '../org-unit/org-unit.module';

@Module({
  imports: [
    UserModule,
    forwardRef(() => UserModule),
    forwardRef(() => OrgUnitModule),
    forwardRef(() => PositionModule),
  ],
  controllers: [ExternalController],
  providers: [ExternalService, ExternalHandle],
  exports: [ExternalService, ExternalHandle],
})
export class ExternalModule {}
