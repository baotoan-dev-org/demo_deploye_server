import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from 'src/common/services/jwt.service';
import { ConfigService } from '@nestjs/config';
import { SocketNamespace } from '../socket.enum';
import { CacheService } from '@/common/services/cache.service';
import { SocketBaseService } from './socket-base.service';

@WebSocketGateway({
  namespace: SocketNamespace.SYSTEM,
})
export class SocketSystemService
  extends SocketBaseService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  private onlineCount = 'onlineCount';

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {
    super('SocketSystemService');
  }

  afterInit() {
    this.logger.log(`Socket initialized at urls: ${process.env.FE_URLS}`);
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const clientId = client.handshake.query.clientId as string;

      if (clientId) {
        await this.cacheService.incr(this.onlineCount);
        const totalOnline = await this.cacheService.get<number>(this.onlineCount);
        this.wss.emit(this.onlineCount, Math.max(totalOnline ?? 0, 0));
        this.logger.log(`[LandingPage] Client connected: ${clientId}`);
        return;
      }

      // AUTH
      const token = client.handshake.auth?.token;

      if (!token) {
        this.logger.warn(`Missing token for socket ${client.id}`);
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyToken({
        token,
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      // CONNECT
      (client as any).userId = payload.id;
      this.logger.log(`User ${payload.id} connected with socket ${client.id}`);

      // JOIN ROOM
    } catch (err) {
      this.logger.error(`Connection failed for socket ${client.id}`, err);
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const clientId = client.handshake.query.clientId as string;

    if (clientId) {
      await this.cacheService.decr(this.onlineCount);
      const totalOnline = await this.cacheService.get<number>(this.onlineCount);
      this.wss.emit(this.onlineCount, Math.max(totalOnline ?? 0, 0));
      this.logger.log(`[LandingPage] Client disconnected: ${clientId}`);
      return;
    }

    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  // DÀNH CHO VIỆC LẮNG NGHE TỪ CLIENT
  // @SubscribeMessage('Tên event on')
  // handleMessage(client: Socket, data: string) {
  //   try {
  //     //
  //   } catch (error) {
  //     this.logger.error(error.message);
  //     return error;
  //   }
  // }
}
