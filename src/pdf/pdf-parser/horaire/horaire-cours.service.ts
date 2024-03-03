import PDFParser, { Output, Page, Text } from 'pdf2json';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FileUtil } from '../../../utils/pdf/fileUtils';
import { firstValueFrom } from 'rxjs';
import { HoraireCours } from './HoraireCours';
import { Period } from './Period';
import { Group } from './Group';

@Injectable()
export class HoraireCoursService {
  private readonly PREALABLE_X_AXIS = 29.86;

  private readonly START_PAGE_CONTENT_Y_AXIS = 14.019;
  private readonly END_PAGE_CONTENT_Y_AXIS = 59;

  constructor(
    private httpService: HttpService,
    private fileUtil: FileUtil,
  ) {}

  async parsePdfFromUrl(pdfUrl: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(pdfUrl, { responseType: 'arraybuffer' }),
      );
      return this.parseHoraireCoursPdf(Buffer.from(response.data));
    } catch (error) {
      throw new Error('Error fetching PDF from URL ' + error);
    }
  }

  // Parses the PDF buffer to extract course information
  private async parseHoraireCoursPdf(
    pdfBuffer: Buffer,
  ): Promise<HoraireCours[]> {
    const parser = new PDFParser();
    return new Promise((resolve, reject) => {
      parser.on('pdfParser_dataError', (errData: string) =>
        console.error(errData),
      );
      parser.on('pdfParser_dataReady', async (pdfData) => {
        try {
          console.info('Parsing PDF...');
          await this.fileUtil.writeDataToFile(pdfData, 'inputHoraire.json');
          const courses = this.processPdfData(pdfData);
          await this.fileUtil.writeDataToFile(courses, 'coursesHoraire.json');
          resolve(courses);
        } catch (error) {
          reject(error);
        }
      });
      parser.parseBuffer(pdfBuffer);
    });
  }

  // Processes the raw PDF data to extract course information
  private processPdfData(pdfData: Output): HoraireCours[] {
    try {
      const courses: HoraireCours[] = [];
      let currentCourse: HoraireCours = new HoraireCours();
      let currentGroupNumber = '';
      let periods: Period[] = []; // To accumulate periods for the current group

      pdfData.Pages.forEach((page: Page) => {
        const pageData = page.Texts;

        pageData.forEach((textItem: Text) => {
          const {
            textContent: text,
            fontSize,
            bold,
            xPos,
            yPos,
          } = this.extractTextDetails(textItem);

          if (!text || yPos > this.END_PAGE_CONTENT_Y_AXIS || bold) return; //Les cells du header (COURS, ...) sont en gras

          if (HoraireCours.isCourseCode(text, xPos)) {
            // Finalize the last group of the current course if necessary
            if (
              currentCourse.code &&
              currentGroupNumber &&
              !Period.isPeriodEmpty(periods[periods.length - 1])
            ) {
              currentCourse.finalizeGroup(currentGroupNumber, periods);
              periods = [];
            }
            if (currentCourse.code) {
              currentCourse.addOrUpdateCourse(courses);
            }
            currentCourse = new HoraireCours();
            currentCourse.code = text;
            currentGroupNumber = '';
          } else if (HoraireCours.isTitle(text, fontSize)) {
            currentCourse.title += currentCourse.title ? ' ' + text : text;
          } else if (xPos === this.PREALABLE_X_AXIS) {
            currentCourse.prerequisites += currentCourse.prerequisites
              ? ' ' + text
              : text;
          } else if (Group.isGroupNumber(text, xPos)) {
            // Finalize the previous group if necessary
            if (
              currentGroupNumber &&
              periods.length > 0 &&
              !Period.isPeriodEmpty(periods[periods.length - 1])
            ) {
              currentCourse.finalizeGroup(currentGroupNumber, periods);
              periods = [];
            }
            currentGroupNumber = text;
          } else if (currentGroupNumber) {
            if (xPos === Period.JOUR_X_AXIS && Period.isDay(text)) {
              if (
                periods.length === 0 ||
                !Period.isPeriodEmpty(periods[periods.length - 1])
              ) {
                periods.push(new Period());
              }
            } else {
              if (periods.length === 0) {
                periods.push(new Period());
              }
            }
            periods[periods.length - 1].handlePeriodDetailTypes(text);
          }
        });

        // Finalize the last group of the last course on the page
        if (currentGroupNumber) {
          currentCourse.finalizeGroup(currentGroupNumber, periods);
          periods = [];
        }
      });

      if (currentCourse.code) {
        currentCourse.addOrUpdateCourse(courses);
      }

      return courses;
    } catch (err) {
      console.error('Error parsing pdf data: ' + err);
      throw new Error('Error processing PDF data');
    }
  }

  private extractTextDetails(textItem: Text) {
    const textContent = decodeURIComponent(textItem.R[0].T).trim();
    const fontSize = textItem.R[0].TS[1];
    const bold = textItem.R[0].TS[2];
    const xPos = textItem.x;
    const yPos = textItem.y;
    return { textContent, fontSize, bold, xPos, yPos };
  }
}
