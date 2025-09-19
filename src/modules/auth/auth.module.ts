import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthHandle } from './auth.handle';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserModule } from '../user/user.module';
import { AuthCron } from './auth.cron';
import { Otp } from './entities/otp.entity';
import { RootModule } from '../root/root.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken, Otp]), UserModule, RootModule, SystemModule],
  controllers: [AuthController],
  providers: [AuthService, AuthHandle, AuthCron],
  exports: [AuthService, AuthHandle],
})
export class AuthModule {}
