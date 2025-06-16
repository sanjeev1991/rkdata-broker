import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UpstoxAccount,
  UpstoxAccountSchema,
} from './schema/upstox-account.schema';
import { UpstoxService } from './upstox.service';
import { UpstoxController } from './upstox.controller';
import { WebhookController } from './webhook.controller';
import { UpstoxManager } from './upstox.manager';
import { CsvLoggerModule } from '../csv-logger/csv-logger.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UpstoxAccount.name, schema: UpstoxAccountSchema },
    ]),
    CsvLoggerModule, // Importing CsvLoggerModule to use its services
  ],
  providers: [UpstoxService, UpstoxManager],
  controllers: [UpstoxController, WebhookController],
})
export class UpstoxModule {}
