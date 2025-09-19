import { JwtService } from '@/common/services/jwt.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExternalService {
  constructor(
    private jwtService: JwtService,

    private configService: ConfigService,
  ) {}

  async generateExternalToken() {
    const externalToken = this.jwtService.generateTokenNoExPire({
      payload: { id: uuidv4() },
      secret: this.configService.get('JWT_EXTERNAL_SECRET'),
    });

    return { externalToken };
  }

  async ioooSendNotification() {
    return { success: true, data: {} };
  }
}
