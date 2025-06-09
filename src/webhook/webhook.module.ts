import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UpstoxNotification,
  UpstoxNotificationSchema,
} from './upstox-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UpstoxNotification.name, schema: UpstoxNotificationSchema },
    ]),
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
