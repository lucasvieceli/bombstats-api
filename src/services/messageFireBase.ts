import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class MessageFirebaseService {
  constructor() {}

  async sendMessageToTopic(topic: string, data: any): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    try {
      await admin.messaging().send({
        topic: topic,
        data: data,
      });

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}
