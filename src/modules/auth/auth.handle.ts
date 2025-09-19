import { Injectable } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from 'src/common/services/jwt.service';

@Injectable()
export class AuthHandle {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  generateAccessRefreshToken(user: User) {
    const accessToken = this.jwtService.generateToken({
      payload: {
        id: user.id,
      },
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      timeExpire: this.configService.get('JWT_ACCESS_EXPIRE_TIME'),
    });

    const refreshToken = this.jwtService.generateToken({
      payload: {
        id: user.id,
      },
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      timeExpire: this.configService.get('JWT_REFRESH_EXPIRE_TIME'),
    });

    return { accessToken, refreshToken };
  }
}
