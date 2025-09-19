import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Admin, Kafka } from 'kafkajs';
import { KAFKA_CONFIG } from '../kafka.constant';
import { KafkaTopics } from '../kafka.enum';

@Injectable()
export class KafkaAdminService {
  // implements OnModuleInit
  private readonly logger = new Logger(KafkaAdminService.name);
  private admin: Admin;

  constructor() {
    const kafka = new Kafka({
      clientId: KAFKA_CONFIG.CLIENT_ID + '-admin',
      brokers: [KAFKA_CONFIG.BOOTSTRAP_SERVERS],
    });
    this.admin = kafka.admin();
  }

  // async onModuleInit() {
  //   // Auto-initialize common topics when module starts
  //   await this.createTopicIfNotExists(KafkaTopics.USER_LIST_RELATION_ANCESTOR_ORG_UNIT);
  // }

  async checkTopicExists(topicName: string): Promise<boolean> {
    try {
      await this.admin.connect();
      const existingTopics = await this.admin.listTopics();
      return existingTopics.includes(topicName);
    } catch (error) {
      this.logger.error(`Error checking topic '${topicName}':`, error);
      return false;
    } finally {
      await this.admin.disconnect();
    }
  }

  async createTopicIfNotExists(
    topicName: string,
    partitions = 3,
    replicationFactor = 1,
  ): Promise<boolean> {
    try {
      await this.admin.connect();

      const existingTopics = await this.admin.listTopics();

      if (!existingTopics.includes(topicName)) {
        await this.admin.createTopics({
          topics: [
            {
              topic: topicName,
              numPartitions: partitions,
              replicationFactor: replicationFactor,
            },
          ],
        });

        this.logger.log(`Topic '${topicName}' created successfully`);
        return true;
      } else {
        this.logger.log(`Topic '${topicName}' already exists`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error creating topic '${topicName}':`, error);
      throw error;
    } finally {
      await this.admin.disconnect();
    }
  }

  async checkMessageExists(topicName: string, key: string): Promise<boolean> {
    try {
      const kafka = new Kafka({
        clientId: KAFKA_CONFIG.CLIENT_ID + '-consumer-check',
        brokers: [KAFKA_CONFIG.BOOTSTRAP_SERVERS],
      });

      const consumer = kafka.consumer({
        groupId: KAFKA_CONFIG.CONSUMER_GROUP_ID + '-check-' + Date.now(), // Unique group ID
      });

      await consumer.connect();
      await consumer.subscribe({ topic: topicName, fromBeginning: true });

      let messageExists = false;
      let messageCount = 0;

      return new Promise((resolve) => {
        const timeout = setTimeout(async () => {
          this.logger.log(
            `Timeout reached. Checked ${messageCount} messages. Key '${key}' ${messageExists ? 'found' : 'not found'}`,
          );
          await consumer.disconnect();
          resolve(messageExists);
        }, 10000); // Increase timeout to 10 seconds

        consumer
          .run({
            eachMessage: async ({ message }) => {
              messageCount++;
              this.logger.log(`Checking message ${messageCount}: key=${message.key?.toString()}`);

              if (message.key && message.key.toString() === key) {
                messageExists = true;
                this.logger.log(`Found message with key '${key}'`);
                clearTimeout(timeout);
                await consumer.disconnect();
                resolve(true);
              }
            },
          })
          .catch((error) => {
            this.logger.error('Error in consumer run:', error);
            clearTimeout(timeout);
            resolve(false);
          });
      });
    } catch (error) {
      this.logger.error(`Error checking message with key '${key}':`, error);
      return false;
    }
  }
}
