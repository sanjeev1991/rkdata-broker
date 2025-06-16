// src/csv-logger/csv-logger.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { writeToPath } from '@fast-csv/format';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class CsvLoggerService {
  private readonly logger = new Logger(CsvLoggerService.name);
  private readonly csvDir = join(process.cwd(), 'tick-data');

  constructor(@InjectQueue('csv-write') private csvQueue: Queue) {
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    if (!existsSync(this.csvDir)) {
      mkdirSync(this.csvDir, { recursive: true });
      this.logger.log(`Created directory for tick data: ${this.csvDir}`);
    }
  }

  private getFilePath(symbol: string): string {
    const date = new Date().toISOString().split('T')[0];
    return join(this.csvDir, `${symbol}-${date}.csv`);
  }

  async logTickToCsv(symbol: string, tickData: any) {
    const filePath = this.getFilePath(symbol);
    const headers = Object.keys(tickData);
    const data = Object.values(tickData);

    try {
      await this.csvQueue.add('write-tick', {
        filePath,
        headers,
        data,
      });
    } catch (error) {
      this.logger.error(`Failed to queue CSV write for ${symbol}: ${error.message}`);
    }
  }
}