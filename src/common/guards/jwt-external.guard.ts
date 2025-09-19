import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from 'src/common/services/jwt.service';

@Injectable()
export class JwtExternalGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,

    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const token = this.jwtService.getTokenFromRequest(req);

    await this.jwtService.verifyToken({
      token,
      secret: this.configService.get('JWT_EXTERNAL_SECRET'),
    });

    return true;
  }
}
