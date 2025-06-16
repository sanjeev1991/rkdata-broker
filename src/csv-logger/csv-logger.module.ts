// src/csv-logger/csv-logger.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CsvLoggerService } from './csv-logger.service';
import { CsvWriterProcessor } from './csv-writer.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'csv-write',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
  ],
  providers: [CsvLoggerService, CsvWriterProcessor],
  exports: [CsvLoggerService],
})
export class CsvLoggerModule {}