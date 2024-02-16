import PDFParser from 'pdf2json';
import { HttpService } from '@nestjs/axios';
import { writeDataToFile } from '../../utils/pdf/fileUtils';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CourseCodeValidationPipe } from '../pipes/course-code-validation-pipe';

interface Course {
  code: string;
  title: string;
  available: any[];
}

// type Availability = {
//   J: boolean;
//   S: boolean;
//   I: boolean;
//   other?: string;
// };

class Column {
  id: any;
  headerName: any;
  startX: any;
  endX: any;
  startY: any;
  endY: any;
  constructor(id, headerName, startX, endX, startY, endY) {
    this.id = id;
    this.headerName = headerName;
    this.startX = startX;
    this.endX = endX;
    this.startY = startY;
    this.endY = endY;
  }
}
@Injectable()
export class PlanificationCoursService {
  private readonly COURS_X_AXIS = 1.648;

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
          reject(error);
        }
      });
      parser.parseBuffer(pdfBuffer);
    });
  }

  private processPdfData(err: null | Error, pdfData: any): Course[] {
    const headerCells: Column[] = this.parseHeaderCells(pdfData);
    writeDataToFile(headerCells, 'headerCells.json');
    const courses: Course[] = [];
    let currentCourse: Course = this.initializeCourse();
    let tempTitle = '';

    pdfData.Pages.forEach((page: any) => {
      page.Texts.forEach((textItem: any) => {
        const { textContent, xPos, yPos } = this.extractTextDetails(textItem);

        // Process course code
        if (
          xPos === this.COURS_X_AXIS &&
          this.isCourseCode(textContent, xPos)
        ) {
          if (currentCourse.code !== '') {
            currentCourse.title = tempTitle.trim();
            courses.push(currentCourse);
          }
          currentCourse = this.initializeCourse();
          currentCourse.code = textContent;
        } else {
          // Process other columns
          const currentColumn = this.getColumnDetails(headerCells, xPos, yPos);
          if (currentColumn) {
            if (currentColumn.id === 1) {
              // Append to temporary title
              tempTitle += textContent + ' ';
            } else if (this.isSession(currentColumn.headerName)) {
              // Check and add availability
              let availabilityKey = currentColumn.headerName; // Assuming headers like 'E23', 'A23'
              currentCourse.available.push({
                [availabilityKey]: true, // Assuming availability is boolean
              });
            }
          }
        }
      });
    });
    if (currentCourse.code !== '') {
      currentCourse.title = tempTitle.trim();
      courses.push(currentCourse);
    }
    return courses;
  }

  private isTextInCell(
    text: {
      R: { TS: [number, number, number, number]; T: string }[];
      x: any;
      y: any;
    },
    column: { startX: any; endX: any; startY: any; endY: any },
  ) {
    return (
      text.x >= column.startX &&
      text.x <= column.endX &&
      text.y >= column.startY &&
      text.y <= column.endY
    );
  }

  private parseHeaderCells(pdfData: {
    Pages: {
      Fills: any;
      Texts: { R: { TS: [number, number, number, number]; T: string }[] }[];
    }[];
  }) {
    const columns: Column[] = [];
    const headerFills = pdfData.Pages[0].Fills.filter(
      (fill: { clr: number }) => fill.clr === 5,
    );

    headerFills.forEach(
      (fill: { x: any; w: any; y: any; h: any }, index: any) => {
        const startX = fill.x;
        const endX = fill.x + fill.w;
        const startY = fill.y;
        const endY = fill.y + fill.h;
        let headerName = '';

        pdfData.Pages[0].Texts.forEach(
          (text: {
            R: { TS: [number, number, number, number]; T: string }[];
          }) => {
            // if (this.isTextInCell(text, { startX, endX, startY, endY })) {
            headerName += text.R.map((r) => decodeURIComponent(r.T)).join(' ');
            // }
          },
        );

        headerName = headerName.trim();
        columns.push(new Column(index, headerName, startX, endX, startY, endY));
      },
    );

    return columns;
  }

  private getColumnDetails(columns: Column[], x: any, y: any) {
    const column = columns.find(
      (column) =>
        x >= column.startX &&
        x <= column.endX &&
        y >= column.startY &&
        y <= column.endY,
    );
    return column;
  }

  private extractTextDetails(textItem: {
    R: { TS: [number, number, number, number]; T: string }[];
    x: number;
    y: number;
  }): { textContent: string; xPos: number; yPos: number } {
    const textContent = decodeURIComponent(textItem.R[0].T).trim();
    const xPos = textItem.x;
    const yPos: number = textItem.y;
    return { textContent, xPos, yPos };
  }

  private initializeCourse(): Course {
    return {
      code: '',
      title: '',
      available: [],
    };
  }

  private isCourseCode(textContent: string, xPos: number): boolean {
    console.log(textContent);
    console.log(
      textContent + this.courseCodeValidationPipe.transform(textContent) &&
        xPos == this.COURS_X_AXIS,
    );
    return (
      this.courseCodeValidationPipe.transform(textContent) &&
      xPos == this.COURS_X_AXIS
    );
  }

  private isSession(text: string): boolean {
    const regex = /^[AHE]\d{2}$/;
    return regex.test(text);
  }
}
