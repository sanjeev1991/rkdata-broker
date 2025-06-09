import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpstoxNotification } from './upstox-notification.schema';

@Injectable()
export class WebhookService {
  constructor(
    @InjectModel(UpstoxNotification.name)
    private notificationModel: Model<UpstoxNotification>,
  ) {}

  async saveNotification(
    payload: Record<string, unknown>,
  ): Promise<UpstoxNotification> {
    return this.notificationModel.create({ payload });
  }
}
