import { Controller, Get, Logger, Query } from '@nestjs/common';
import { UpstoxService } from '../upstox/upstox.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly upstoxService: UpstoxService) {}

  @Get('upstox')
  async handleUpstoxRedirect(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    this.logger.log(`Received Upstox redirect: code=${code}, state=${state}`);

    if (!code || !state) {
      this.logger.warn('Missing code or state in Upstox redirect');
      return { received: false, error: 'Missing code or state' };
    }

    await this.upstoxService.saveAuthCode(state, code);
    await this.upstoxService.exchangeCodeForTokens(state);

    return { received: true, processed: true };
  }
}
