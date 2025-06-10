import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UpstoxAccount,
  UpstoxAccountSchema,
} from './schema/upstox-account.schema';
import { UpstoxService } from './upstox.service';
import { UpstoxController } from './upstox.controller';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UpstoxAccount.name, schema: UpstoxAccountSchema },
    ]),
  ],
  providers: [UpstoxService],
  controllers: [UpstoxController, WebhookController],
})
export class UpstoxModule {}
