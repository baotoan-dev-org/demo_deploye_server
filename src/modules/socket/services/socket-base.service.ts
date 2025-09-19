import { Logger } from '@nestjs/common';
import { WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export abstract class SocketBaseService {
  @WebSocketServer() wss: Server;
  protected logger: Logger;
  protected userSockets: Record<string, Socket> = {};

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  getUserSockets() {
    return this.userSockets;
  }

  getUserSocket(id: string) {
    return this.userSockets[id];
  }

  emitPrivate(data: { userId: string; payload: any; event: string }) {
    const { userId, payload, event } = data;
    if (this.userSockets[userId]) {
      this.wss.to(this.userSockets[userId].id).emit(event, payload);
      this.logger.log(`Emit to client: ${this.userSockets[userId].id} with ${event}`);
    } else {
      // fallback: iterate all sockets if not using userSockets
      Array.from((this.wss.sockets as any).values()).forEach((socket: any) => {
        if (socket.userId === userId) {
          socket.emit(event, payload);
          this.logger.log(`Emit to client: ${socket.id} with ${event}`);
        }
      });
    }
  }

  emitRoom(data: { room: string; payload: any; event: string }) {
    const { room, payload, event } = data;
    this.wss.to(room).emit(event, payload);
    this.logger.log(`Emit to room: ${room} with ${event}`);
  }
}
