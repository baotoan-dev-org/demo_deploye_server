import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { TopicMessage } from 'firebase-admin/lib/messaging/messaging-api';

@Injectable()
export class FCMService {
  private fcmAdmin: admin.app.App;

  constructor(private configService: ConfigService) {
    this.fcmAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
        privateKey: this.configService.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    });
  }

  async sendMessageToTopic(params: {
    topic: string;
    title: string;
    message: string;
    path?: string;
    payload?: any;
  }) {
    const { topic, title, message, payload, path } = params;

    const stringifiedPayload = { title, message, path: path || '' };

    if (payload)
      for (const key in payload) {
        if (payload.hasOwnProperty(key)) {
          stringifiedPayload[key] = String(payload[key]);
        }
      }

    const messageNoti: TopicMessage = {
      data: stringifiedPayload,
      topic: topic,
    };

    await this.fcmAdmin
      .messaging()
      .send(messageNoti)
      .then((response) => {
        Logger.log(`Successfully sent message to ${topic}:`, response);
      })
      .catch((error) => {
        Logger.log(`Error sending message to ${topic}:`, error);
      });
  }

  async subscribeTopicByToken(token: string, topic: string) {
    const registrationTokens = [token];

    this.fcmAdmin
      .messaging()
      .subscribeToTopic(registrationTokens, topic)
      .then((response) => {
        if (response.failureCount > 0)
          Logger.log('Error subscribing to topic:', response.errors[0].error);
        else Logger.log('Successfully subscribed to topic: ' + topic, response);
      })
      .catch((error) => {
        Logger.log('Error subscribing to topic:', error);
      });
  }

  async unsubscribeTopicByToken(token: string, topic: string) {
    const registrationTokens = [token];
    this.fcmAdmin
      .messaging()
      .unsubscribeFromTopic(registrationTokens, topic)
      .then((response) => {
        if (response.failureCount > 0)
          Logger.log('Error unsubscribing to topic:', response.errors[0].error);
        else Logger.log('Successfully unsubscribed to topic: ' + topic, response);
      })
      .catch((error) => {
        Logger.log('Error unsubscribing to topic:', error);
      });
  }
}
