import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaService } from './services/kafka.service';
import { KafkaController } from './kafka.controller';
import { KAFKA_CONFIG } from './kafka.constant';
import { KafkaAdminService } from './services/kafka-admin.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: KAFKA_CONFIG.CLIENT_ID,
              brokers: [configService.get('KAFKA_BOOTSTRAP_SERVERS')],
              retry: {
                initialRetryTime: 100,
                retries: 8,
              },
            },
            consumer: {
              groupId: KAFKA_CONFIG.CONSUMER_GROUP_ID,
              retry: {
                initialRetryTime: 100,
                retries: 8,
              },
            },
            producer: {
              retry: {
                initialRetryTime: 100,
                retries: 8,
              },
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [KafkaController],
  providers: [KafkaService, KafkaAdminService],
  exports: [KafkaService, KafkaAdminService],
})
export class KafkaModule {}
