import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { Readable } from 'stream';
import * as unzipper from 'unzipper';

import {
  FileExtractionError,
  FileNotFoundError,
} from '../../constants/error-messages';
import { CHEMINEMENTS_TXT_PATH, CHEMINOT_JAR_URL } from '../../constants/url';

@Injectable()
export class FileExtractionService {
  private readonly logger = new Logger(FileExtractionService.name);

  public async extractCheminementsFile(): Promise<string> {
    try {
      // Download the JAR file
      this.logger.log(`Downloading JAR file from URL: ${CHEMINOT_JAR_URL}`);

      const response: AxiosResponse<Readable> = await axios({
        url: CHEMINOT_JAR_URL,
        method: 'GET',
        responseType: 'stream',
      });

      // Extract the cheminements.txt file from the JAR archive stream
      return await new Promise<string>((resolve, reject) => {
        response.data
          .pipe(unzipper.Parse())
          .on('entry', async (entry: unzipper.Entry) => {
            if (entry.path === CHEMINEMENTS_TXT_PATH) {
              this.logger.log(`Found the target file at path: ${entry.path}`);

              const chunks: Buffer[] = [];
              entry.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });

              entry.on('end', () => {
                const fileContent = Buffer.concat(chunks).toString('utf-8');
                resolve(fileContent);
              });
            } else {
              entry.autodrain(); // Skip non-matching files
            }
          })
          .on('error', (error: Error) => {
            this.logger.error('Error extracting the file:', error.message);
            reject(new FileExtractionError(error.message));
          })
          .on('finish', () => {
            reject(new FileNotFoundError(CHEMINEMENTS_TXT_PATH));
          });
      });
    } catch (error) {
      this.logger.error(
        'Error extracting the file:',
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof Error) {
        throw new FileExtractionError(error.message);
      } else {
        throw new FileExtractionError(
          'An unknown error occurred during file extraction.',
        );
      }
    }
  }
}
