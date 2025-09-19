import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { BaseKafkaMessage } from '../interfaces/kafka.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaService {
  constructor(
    @Inject('KAFKA_SERVICE') private client: ClientKafka,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // Subscribe to topics for consuming
      // this.client.subscribeToResponseOf('user.created');

      // Connect with timeout to prevent blocking server startup
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Kafka connection timeout')), 7000),
        ),
      ]);
    } catch (error) {
      console.error('Kafka connection failed, but continuing server startup:', error);
      // Don't throw error to prevent blocking server startup
    }
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  // Send message to Kafka
  sendMessage<T>(topic: string, message: BaseKafkaMessage<T>): Observable<T> {
    try {
      return this.client.send(topic, message);
    } catch (error) {
      console.error(`Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  // Safe emit - doesn't throw errors, just logs them
  emitEvent<T>(topic: string, data: BaseKafkaMessage<T>): void {
    try {
      if (this.configService.get('SERVER_BUILD') !== 'develop') return;

      this.client.emit(topic, data).subscribe({
        error: (error) => {
          console.error(`Failed to emit event to topic ${topic}:`, error);
        },
      });
    } catch (error) {
      console.error(`Failed to emit event to topic ${topic}:`, error);
    }
  }
}
