import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Fill, Output, Page, Text } from 'pdf2json';
import { firstValueFrom } from 'rxjs';

import { getPlanificationPdfUrl } from '../../../../constants/url';
import { CourseCodeValidationPipe } from '../../../../pipes/models/course/course-code-validation-pipe';
import { PdfParserUtil } from '../../../../utils/pdf/parser/pdfParserUtil';
import { TextExtractor } from '../../../../utils/pdf/parser/textExtractorUtil';
import { ICoursePlanification } from './planification-cours.types';
import { Row } from './Row';

@Injectable()
export class PlanificationCoursService {
  private readonly BORDER_OFFSET = 0.124;

  private readonly courseCodeValidationPipe = new CourseCodeValidationPipe();

  constructor(private readonly httpService: HttpService) { }

  public async parseProgramPlanification(
    programCode: string,
  ): Promise<ICoursePlanification[]> {
    try {
      const pdfUrl = getPlanificationPdfUrl(programCode);
      return await this.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new Error(
        `Error parsing Planification-PDF for program: ${programCode}\n` + error,
      );
    }
  }

  public async parsePdfFromUrl(
    pdfUrl: string,
  ): Promise<ICoursePlanification[]> {
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

  public parsePlanificationCoursPdf(
    pdfBuffer: Buffer,
    pdfUrl: string,
  ): Promise<ICoursePlanification[]> {
    return PdfParserUtil.parsePdfBuffer(pdfBuffer, (pdfData) =>
      this.processPdfData(pdfData, pdfUrl),
    );
  }

  public processPdfData(
    pdfData: Output,
    pdfUrl: string,
  ): ICoursePlanification[] {
    try {
      const headerCells: Row[] = this.parseHeaderCells(pdfData);
      const courses: ICoursePlanification[] = [];
      let currentCourse: ICoursePlanification = this.initializeCourse();

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
            // Process other columns
          } else if (
            currentColumn &&
            this.isSession(currentColumn.headerName)
          ) {
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
        });
      });

      if (currentCourse.code !== '') {
        courses.push(currentCourse);
      }

      if (courses.length === 0)
        throw new Error(`No courses found in the PDF located at ${pdfUrl}.`);

      return courses;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Error processing PDF data: ${err.message}`);
      }

      throw new Error(`Error processing PDF data: ${err}`);
    }
  }

  private initializeCourse(): ICoursePlanification {
    return {
      code: '',
      available: {},
    };
  }

  // Example: [ code, title, H24, E24, A24, H25, E25]
  public parseHeaderCells(pdfData: { Pages: Page[] }): Row[] {
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
          headerName += text.R[0].T.trim() + ' ';
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
