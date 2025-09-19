import { Module } from '@nestjs/common';
import { SocketSystemService } from './services/socket-system.service';
import { SocketChatService } from './services/socket-chat.service';

@Module({
  providers: [SocketSystemService, SocketChatService],
  exports: [SocketSystemService, SocketChatService],
})
export class SocketModule {}
