import { All, Body, Controller, Headers, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @All('upstox')
  async handleUpstoxWebhook(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
  ) {
    console.log('🔔 Webhook Triggered');
    console.log('👉 Method:', req.method);
    console.log('👉 Headers:', headers);
    console.log('👉 Body:', body);

    const data = {
      method: req.method,
      headers,
      body,
    };

    const saved = await this.webhookService.saveNotification(data);
    return { success: true, id: saved._id };
  }
}
