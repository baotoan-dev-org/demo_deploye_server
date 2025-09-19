import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './modules/app.module';
import { SwaggerAuthMiddleware } from './common/middlewares/swagger-auth.middleware';
import { SocketIoAdapter } from './common/adapter/socket.adapter';
import { Logger } from '@nestjs/common';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import * as bodyParser from 'body-parser';
import { KAFKA_CONFIG } from './modules/kafka/kafka.constant';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
// import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Cấu hình Kafka microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CONFIG.CLIENT_ID + '-server', // QUAN TRỌNG: Thêm clientId
        brokers: [configService.get('KAFKA_BOOTSTRAP_SERVERS')],
      },
      consumer: {
        groupId: KAFKA_CONFIG.CONSUMER_GROUP_ID,
      },
    },
  });

  // Khởi động microservice với timeout để không block server startup
  try {
    await Promise.race([
      app.startAllMicroservices(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Microservice startup timeout')), 10000),
      ),
    ]);
    Logger.log('Kafka microservice started successfully');
  } catch (error) {
    Logger.error('Failed to start Kafka microservice, but continuing with HTTP server:', error);
    // Continue with HTTP server startup even if Kafka fails
  }

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Helmet
  app.use(helmet());

  // Against CSRF or XSRF
  // app.use(csurf());

  // Adapter
  const socketIoAdapter = new SocketIoAdapter(app, configService);
  await socketIoAdapter.connectToRedis();
  app.useWebSocketAdapter(socketIoAdapter);

  // Cors
  // app.enableCors({
  //   origin: [
  //     ...configService.get('FE_URLS').split(','),
  //     ...configService.get('EXTERNAL_FE_URLS').split(','),
  //   ],
  //   // origin: '*', // For development purposes, change to specific URLs in production
  //   credentials: true,
  // });

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, origin);
    },

    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  // transform: true Dùng để chuyển đổi properties trong DTO
  // whitelist: true Dùng để xóa những thuộc tính dư khi thực hiện request. Ví dụ cho truyền a mà truyền a, b

  // Swagger
  app.use('/api', new SwaggerAuthMiddleware().use);

  const config = new DocumentBuilder()
    .setTitle('Office Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'userUnitPositionId',
      in: 'header',
      required: true,
      schema: { type: 'string' },
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/api', app, document, {
    // customCss: fs.readFileSync('./swagger-theme.css', 'utf8'),
    swaggerOptions: {
      persistAuthorization: true,
      syntaxHighlight: { activated: true, theme: 'monokai' },
    },
  });

  // Interceptor
  app.useGlobalInterceptors(new TimeoutInterceptor(20000));

  await app.listen(configService.get('OFFICE_BE_PORT'));

  Logger.log(`App running on ${await app.getUrl()}`);
}
bootstrap();
