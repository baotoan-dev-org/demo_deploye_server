import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ForbiddenException } from '@nestjs/common';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.type';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from 'src/modules/auth/entities/refresh-token.entity';
import { Repository } from 'typeorm';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';

@Injectable()
export class JwtService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

    private configService: ConfigService,
  ) {}

  generateToken(params: { payload: JwtPayload; secret: string; timeExpire: string }) {
    const { payload, secret, timeExpire } = params;

    return jwt.sign(payload, secret, {
      expiresIn: timeExpire as any,
    });
  }

  generateTokenNoExPire(params: { payload: JwtPayload; secret: string }) {
    const { payload, secret } = params;

    return jwt.sign(payload, secret);
  }

  async verifyToken(params: { token: string; secret: string }) {
    const { token, secret } = params;
    let payload = {};

    try {
      jwt.verify(token, secret, (error: jwt.VerifyErrors, data: jwt.JwtPayload) => {
        if (error) throw error;

        delete data.iat;
        delete data.exp;
        payload = data;
      });

      return payload as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        if (secret === this.configService.get('JWT_REFRESH_SECRET')) {
          await this.refreshTokenRepo.delete({ refreshToken: token });

          throw new HttpException('Phiên đăng nhập của bạn đã hết hạn!', 888);
        }

        if (
          secret === this.configService.get('OTP_SECRET') ||
          secret === this.configService.get('OTP_SECRET')
        )
          throw new UnauthorizedException('Token đã hết hạn, vui lòng thực hiện lại thao tác!');

        throw new HttpException('Token của bạn đã hết hạn!', 777);
      }

      throw new UnauthorizedException('Token của bạn không chính xác!');
    }
  }

  getTokenFromRequest = (request: Request) => {
    const authHeader: string = request.headers['authorization'];

    if (!authHeader || !authHeader.includes('Bearer '))
      throw new UnauthorizedException('Bạn chưa xác thực!');

    return authHeader.slice(7);
  };

  async getPositionAndOrgFromUserUnitPositionId(
    userUnitPositionId: string,
  ): Promise<UserOrgUnitPosition> {
    return await this.userOrgUnitPositionRepo.findOne({
      where: { id: userUnitPositionId as string },
      select: ['positionId', 'orgUnitId'],
    });
  }
}
