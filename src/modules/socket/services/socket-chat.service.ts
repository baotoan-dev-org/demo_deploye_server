import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from 'src/common/services/jwt.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@/common/services/cache.service';
import { SocketNamespace } from '../socket.enum';
import { SocketBaseService } from './socket-base.service';

@WebSocketGateway({
  namespace: SocketNamespace.CHAT,
})
export class SocketChatService
  extends SocketBaseService
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    super('SocketChatService');
  }

  afterInit() {
    this.logger.log(`Chat socket initialized at urls: ${process.env.FE_URLS}`);
  }

  buildRoomName(id: string) {
    return `chat_${id}`;
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      const initialRoomId = client.handshake.auth?.roomId as string | undefined;

      if (!token) {
        this.logger.warn(`Missing token for chat socket ${client.id}`);
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyToken({
        token,
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      (client.data ||= {}).userId = payload.id;
      this.userSockets[payload.id] = client;
      this.logger.log(`User ${payload.id} connected socket ${client.id}`);

      if (initialRoomId) await this.joinRoom(client, initialRoomId);

      this.registerRuntimeEvents(client);
    } catch (err) {
      this.logger.error(`Chat connection failed ${client.id}`, err);
      client.disconnect(true);
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Chat socket disconnected: ${client.id}`);
    const uid = client.data?.userId;
    if (uid && this.userSockets[uid]?.id === client.id) delete this.userSockets[uid];
  }

  registerRuntimeEvents(client: Socket) {
    client.on('join-project-task', async (roomId: string) => {
      try {
        await this.joinRoom(client, roomId);
        client.emit('room:joined', { roomId });
      } catch (e) {
        client.emit('room:error', { action: 'join', message: (e as any)?.message });
      }
    });

    client.on('leave-project-task', async (roomId?: string) => {
      try {
        await this.leaveRoom(client, roomId);
        client.emit('room:left', { roomId: roomId || client.data.currentRoomId });
      } catch (e) {
        client.emit('room:error', { action: 'leave', message: (e as any)?.message });
      }
    });

    client.on('auth:refresh', async (nextToken: string) => {
      try {
        const payload = await this.jwtService.verifyToken({
          token: nextToken,
          secret: this.configService.get('JWT_ACCESS_SECRET'),
        });
        client.data.userId = payload.id;
        client.emit('auth:ok');
      } catch {
        client.emit('auth:invalid');
        client.disconnect(true);
      }
    });
  }

  async joinRoom(client: Socket, roomId: string) {
    const prev = client.data.currentRoomId as string | undefined;
    if (prev && prev !== roomId) await client.leave(this.buildRoomName(prev));

    const roomName = this.buildRoomName(roomId);
    if (!client.rooms.has(roomName)) {
      await client.join(roomName);
      this.logger.log(
        `Socket ${client.id} (userId=${client.data?.userId}) joined room ${roomName}`,
      );
    }
    client.data.currentRoomId = roomId;
  }

  async leaveRoom(client: Socket, roomId?: string) {
    const current = client.data.currentRoomId as string | undefined;
    const target = roomId ?? current;
    if (!target) return;
    const roomName = this.buildRoomName(target);
    if (client.rooms.has(roomName)) {
      await client.leave(roomName);
      this.logger.log(`Socket ${client.id} (userId=${client.data?.userId}) left room ${roomName}`);
    }
    if (current === target) client.data.currentRoomId = null;
  }
}
