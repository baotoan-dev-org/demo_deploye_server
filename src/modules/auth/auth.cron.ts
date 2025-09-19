import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Otp } from './entities/otp.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthCron {
  constructor(
    @InjectRepository(Otp)
    private otpRepo: Repository<Otp>,

    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  @Cron('0 0 1 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async deleteOtpExpired() {
    Logger.log('Running cron delete otp expired!');
  }

  @Cron('0 0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async deleteRefreshTokenUsed() {
    Logger.log('Running cron delete refresh token used!');
  }
}
