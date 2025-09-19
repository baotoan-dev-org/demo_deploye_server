import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class SocketIoAdapter extends IoAdapter {
  private redisAdapterFn: (...args: any[]) => any;

  constructor(
    app: INestApplication,
    private configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get('REDIS_HOST');
    const redisPort = this.configService.get('REDIS_PORT');
    const redisPassword = this.configService.get('REDIS_PASSWORD');

    const pubClient = createClient({
      url: `redis://:${redisPassword}@${redisHost}:${redisPort}/0`,
    });

    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.redisAdapterFn = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const corsOrigins = this.configService.get('FE_URLS').split(',');

    const serverOptions: ServerOptions = {
      ...options,
      cors: {
        origin: '*',
        credentials: true,
      },
    };

    const server = super.createIOServer(port, serverOptions);
    if (this.redisAdapterFn) {
      server.adapter(this.redisAdapterFn);
    }
    return server;
  }
}
