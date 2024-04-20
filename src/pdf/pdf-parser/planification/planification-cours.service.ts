import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Fill, Output, Page, Text } from 'pdf2json';
import { firstValueFrom } from 'rxjs';

import { FileUtil } from '../../../utils/pdf/fileUtil';
import { PdfParserUtil } from '../../../utils/pdf/parser/pdfParserUtil';
import { TextExtractor } from '../../../utils/pdf/parser/textExtractorUtil';
import { CourseCodeValidationPipe } from '../../pipes/course-code-validation-pipe';
import { PlanificationCours } from './planification-cours.types';
import { Row } from './Row';

@Injectable()
export class PlanificationCoursService {
  // private readonly COURS_X_AXIS = 1.648;
  private readonly BORDER_OFFSET = 0.124;

  private courseCodeValidationPipe = new CourseCodeValidationPipe();

  constructor(
    private httpService: HttpService,
    private fileUtil: FileUtil,
  ) {}

  public async parsePdfFromUrl(pdfUrl: string): Promise<PlanificationCours[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(pdfUrl, { responseType: 'arraybuffer' }),
      );
      return await this.parsePlanificationCoursPdf(
        Buffer.from(response.data),
        pdfUrl,
      );
    } catch (error) {
      throw new Error('Error fetching pdf from URL ' + error);
    }
  }

  private parsePlanificationCoursPdf(
    pdfBuffer: Buffer,
    pdfUrl: string,
  ): Promise<PlanificationCours[]> {
    return PdfParserUtil.parsePdfBuffer(pdfBuffer, (pdfData) =>
      this.processPdfData(pdfData, pdfUrl),
    );
  }

  private processPdfData(
    pdfData: Output,
    pdfUrl: string,
  ): PlanificationCours[] {
    try {
      const headerCells: Row[] = this.parseHeaderCells(pdfData);
      this.fileUtil.writeDataToFile(headerCells, 'headerCells.json');
      const courses: PlanificationCours[] = [];
      let currentCourse: PlanificationCours = this.initializeCourse();

      pdfData.Pages.forEach((page: Page) => {
        page.Texts.forEach((textItem: Text) => {
          const { textContent, xPos } =
            TextExtractor.extractTextDetails(textItem);

          const currentColumn = Row.getColumnHeaderName(headerCells, xPos);
          // Process course code
          if (
            currentColumn &&
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

      if (courses.length === 0)
        throw new Error(`No courses found in the PDF located at ${pdfUrl}.`);

      return courses;
    } catch (err) {
      throw new Error('Error processing PDF data');
    }
  }

  private initializeCourse(): PlanificationCours {
    return {
      code: '',
      available: {},
    };
  }

  // Example: [ code, title, H24, E24, A24, H25, E25]
  private parseHeaderCells(pdfData: { Pages: Page[] }): Row[] {
    const columns: Row[] = [];
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
      columns.push(new Row(index, headerName, startX, endX));
    });
    return columns;
  }

  private isTextInCell(
    text: Text,
    column: { startX: number; endX: number; startY: number; endY: number },
  ): boolean {
    return (
      text.x >= column.startX &&
      text.x <= column.endX &&
      text.y >= column.startY &&
      text.y <= column.endY
    );
  }

  private isCourseCode(textContent: string): boolean {
    return Boolean(this.courseCodeValidationPipe.transform(textContent));
  }

  private isAvailability(textContent: string): boolean {
    const allowedCombinations = 'JSI';
    const regex = new RegExp(`^(?!.*(.).*\\1)[${allowedCombinations}]+$`);
    return regex.test(textContent);
  }

  private isSession(text: string): boolean {
    const regex = /^[AHE]\d{2}$/;
    return regex.test(text);
  }
}
