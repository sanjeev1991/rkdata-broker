// src/csv-logger/csv-writer.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { appendFileSync, createWriteStream, existsSync, writeFileSync } from 'fs';
import { format } from '@fast-csv/format';

@Processor('csv-write')
export class CsvWriterProcessor {
  private readonly logger = new Logger(CsvWriterProcessor.name);

  @Process('write-tick')
async handleCsvWrite(job: Job<{ filePath: string; headers: string[]; data: any[] }>) {
  const { filePath, headers, data } = job.data;
  
  try {
    const csvStream = format({
      headers: !existsSync(filePath) ? headers : undefined,
      includeEndRowDelimiter: true // This ensures proper line endings
    });

    const writeStream = createWriteStream(filePath, {
      flags: existsSync(filePath) ? 'a' : 'w'
    });

    csvStream.pipe(writeStream);
    csvStream.write(data);
    csvStream.end();

    // Wait for write to complete
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', () => reject());
    });
    
  } catch (error) {
    this.logger.error(`Failed to write CSV for ${filePath}: ${error.message}`);
  }
}
}