import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileUtil {
  constructor(private configService: ConfigService) {}

  writeDataToFile(data: any, fileName: string): Promise<string | null> {
    const pdfOutputPath =
      this.configService.get<string>('pdfOutputPath') ||
      path.join(__dirname, fileName);
    const filePath = path.join(pdfOutputPath, fileName);

    return new Promise((resolve, reject) => {
      const urlDecodeReplacer = (key: string, value: string) => {
        if (typeof value === 'string') {
          try {
            // Decode the value
            return decodeURIComponent(value);
          } catch (error) {
            throw new Error(`Code error while fetching PDF from URL: ${error}`);
          }
        }
        return value;
      };

      fs.writeFile(
        filePath,
        JSON.stringify(data, urlDecodeReplacer, 2),
        (err) => {
          if (err) {
            console.error('Error encountered while writing file: ', err);
            reject(err);
          } else {
            console.log(`File "${fileName}" successfully written`);
            resolve(data);
          }
        },
      );
    });
  }
}
