import { Logger } from '@nestjs/common';
import PDFParser, { Output } from 'pdf2json';

export class PdfParserUtil {
  private static readonly logger = new Logger(PdfParserUtil.name);

  public static async parsePdfBuffer<T>(
    pdfBuffer: Buffer,
    processData: (pdfData: Output) => T,
  ): Promise<T> {
    const parser = new PDFParser();

    return new Promise((resolve, reject) => {
      parser.on('pdfParser_dataError', (errData) => this.logger.error(errData));
      parser.on('pdfParser_dataReady', async (pdfData) => {
        try {
          const result = await processData(pdfData);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      parser.parseBuffer(pdfBuffer);
    });
  }
}
