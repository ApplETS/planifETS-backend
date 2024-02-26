import PDFParser, { Fill, Page, Text } from 'pdf2json';
import { HttpService } from '@nestjs/axios';
import { writeDataToFile } from '../../utils/pdf/fileUtils';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CourseCodeValidationPipe } from '../pipes/course-code-validation-pipe';
import { Column, PlanificationCourse } from './types/pdf-parser.types';

//TODO Add title to the course (cycles superieurs ont plusieurs cours avec le meme code)
//https://horaire.etsmtl.ca/Horairepublication/Planification-CyclesSuperieurs.pdf

@Injectable()
export class PlanificationCoursService {
  private readonly COURS_X_AXIS = 1.648;
  private readonly BORDER_OFFSET = 0.124;

  courseCodeValidationPipe = new CourseCodeValidationPipe();

  constructor(private httpService: HttpService) {}

  async parsePdfFromUrl(pdfUrl: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(pdfUrl, { responseType: 'arraybuffer' }),
      );
      return this.parsePlanificationCoursPdf(Buffer.from(response.data));
    } catch (error) {
      throw new Error('Error fetching pdf from URL ' + error);
    }
  }
  parsePlanificationCoursPdf(pdfBuffer: Buffer): Promise<any> {
    const parser = new PDFParser(this, 1);

    return new Promise((resolve, reject) => {
      parser.on('pdfParser_dataError', (err: any) => {
        try {
          this.processPdfData(err, null);
        } catch (err) {
          console.log(err.stack);
        }
      });
      parser.on('pdfParser_dataReady', async (pdfData) => {
        try {
          await writeDataToFile(pdfData, 'inputPlanification.json');
          const courses = this.processPdfData(null, pdfData);
          await writeDataToFile(courses, 'coursesPlanification.json');
          resolve(courses);
        } catch (error) {
          console.error('Error parsing pdf data: ' + error.stack);
          reject(error);
        }
      });
      parser.parseBuffer(pdfBuffer);
    });
  }

  private processPdfData(
    err: null | Error,
    pdfData: any,
  ): PlanificationCourse[] {
    const headerCells: Column[] = this.parseHeaderCells(pdfData);
    writeDataToFile(headerCells, 'headerCells.json');
    const courses: PlanificationCourse[] = [];
    let currentCourse: PlanificationCourse = this.initializeCourse();

    pdfData.Pages.forEach((page: Page) => {
      page.Texts.forEach((textItem: Text) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { textContent, xPos, yPos } = this.extractTextDetails(textItem); //TODO Check yPos later

        const currentColumn = this.getColumnHeaderName(headerCells, xPos);
        // Process course code
        if (
          currentColumn.headerName === 'code' &&
          this.isCourseCode(textContent)
        ) {
          if (currentCourse.code) {
            courses.push(currentCourse);
          }
          currentCourse = this.initializeCourse();
          currentCourse.code = textContent;
        } else {
          // Process other columns
          if (currentColumn && this.isSession(currentColumn.headerName)) {
            // Check and add availability
            if (this.isAvailability(textContent)) {
              const availabilityKey = currentColumn.headerName; // Example: 'E23'
              if (currentCourse.available[availabilityKey]) {
                currentCourse.available[availabilityKey] += ` ${textContent}`;
              } else {
                currentCourse.available[availabilityKey] = textContent;
              }
            }
          }
        }
      });
    });
    if (currentCourse.code !== '') {
      courses.push(currentCourse);
    }
    return courses;
  }

  private extractTextDetails(textItem: Text): {
    textContent: string;
    xPos: number;
    yPos: number;
  } {
    const textContent = decodeURIComponent(textItem.R[0].T).trim();
    const xPos = textItem.x;
    const yPos: number = textItem.y;
    return { textContent, xPos, yPos };
  }

  private initializeCourse(): PlanificationCourse {
    return {
      code: '',
      available: {},
    };
  }

  // Example: [ code, title, H24, E24, A24, H25, E25]
  private parseHeaderCells(pdfData: { Pages: Page[] }) {
    const columns: Column[] = [];
    const headerFills = pdfData.Pages[0].Fills.filter(
      (fill: Fill) => fill.clr === 5,
    );

    headerFills.forEach((fill: Fill, index: number) => {
      const startX = fill.x - this.BORDER_OFFSET;
      const endX = fill.x + fill.w;
      const startY = fill.y;
      const endY = fill.y + fill.h;
      let headerName = '';
      pdfData.Pages[0].Texts.forEach((text: Text) => {
        if (this.isTextInCell(text, { startX, endX, startY, endY })) {
          headerName += decodeURIComponent(text.R[0].T).trim() + ' ';
        }
      });

      headerName = headerName.trim();
      columns.push(new Column(index, headerName, startX, endX));
    });
    return columns;
  }

  private isTextInCell(
    text: Text,
    column: { startX: number; endX: number; startY: number; endY: number },
  ) {
    return (
      text.x >= column.startX &&
      text.x <= column.endX &&
      text.y >= column.startY &&
      text.y <= column.endY
    );
  }

  private getColumnHeaderName(columns: Column[], x: any) {
    const column = columns.find(
      (column) => x >= column.startX && x <= column.endX,
    );
    return column;
  }

  private isCourseCode(textContent: string): boolean {
    return this.courseCodeValidationPipe.transform(textContent);
  }

  private isAvailability(textContent: string): string {
    const allowedCombinations = 'JSI';
    const regex = new RegExp(`^(?!.*(.).*\\1)[${allowedCombinations}]+$`);

    return regex.test(textContent) ? textContent : '';
  }

  private isSession(text: string): boolean {
    const regex = /^[AHE]\d{2}$/;
    return regex.test(text);
  }
}
