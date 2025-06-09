import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('upstox')
  async handleUpstoxWebhook(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
  ) {
    const data = {
      headers,
      body,
    };

    const saved = await this.webhookService.saveNotification(data);
    return { success: true, id: saved._id };
  }
}
