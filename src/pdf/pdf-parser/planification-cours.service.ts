import PDFParser from 'pdf2json';
import { HttpService } from '@nestjs/axios';
import { writeDataToFile } from '../../utils/pdf/fileUtils';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CourseCodeValidationPipe } from '../pipes/course-code-validation-pipe';

interface Course {
  code: string;
  title: string;
  available: Record<string, string>;
}

class Column {
  id: any;
  headerName: any;
  startX: any;
  endX: any;
  startY: any;
  endY: any;
  constructor(id, headerName, startX, endX) {
    this.id = id;
    this.headerName = headerName;
    this.startX = this.roundToLowerNumber(startX);
    this.endX = this.roundToLowerNumber(endX);
  }

  private roundToLowerNumber(num) {
    return Math.floor(num * 100000) / 100000;
  }
}

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

  private processPdfData(err: null | Error, pdfData: any): Course[] {
    const headerCells: Column[] = this.parseHeaderCells(pdfData);
    writeDataToFile(headerCells, 'headerCells.json');
    const courses: Course[] = [];
    let currentCourse: Course = this.initializeCourse();
    let tempTitle = '';

    pdfData.Pages.forEach((page: any) => {
      page.Texts.forEach((textItem: any) => {
        const { textContent, xPos, yPos } = this.extractTextDetails(textItem); //? Check yPos later

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
          const currentColumn = this.getColumnDetails(
            headerCells,
            xPos,
            textContent,
          ); //TEMPO PASSING TEXT
          if (currentColumn) {
            if (currentColumn.id === 1) {
              // Append to temporary title
              tempTitle += textContent + ' ';
            } else if (this.isSession(currentColumn.headerName)) {
              // Check and add availability
              const availabilityKey = currentColumn.headerName; // Assuming headers like 'E23', 'A23'
              console.log('availabilityKey ' + availabilityKey);
              //Get the text of the cell
              if (currentCourse.available[availabilityKey]) {
                // Append the text to the existing entry
                currentCourse.available[availabilityKey] += ` ${textContent}`;
              } else {
                // Create a new entry for this session
                currentCourse.available[availabilityKey] = textContent;
              }
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
        const startX = fill.x - this.BORDER_OFFSET;
        const endX = fill.x + fill.w;
        const startY = fill.y;
        const endY = fill.y + fill.h;
        let headerName = '';
        //todo Fix pour avoir tt les pages
        pdfData.Pages[0].Texts.forEach(
          (text: {
            R: { TS: [number, number, number, number]; T: string }[];
          }) => {
            if (this.isTextInCell(text, { startX, endX, startY, endY })) {
              headerName += text.R.map((r) => decodeURIComponent(r.T)).join(
                ' ',
              );
            }
          },
        );

        headerName = headerName.trim();
        columns.push(new Column(index, headerName, startX, endX));
      },
    );
    console.log('columns ' + columns.length);
    console.log(columns);
    return columns;
  }

  private getColumnDetails(columns: Column[], x: any, text: any) {
    const column = columns.find(
      (column) => x >= column.startX && x <= column.endX,
    );
    console.log(
      'getColumnDetails, column ' +
        column?.headerName +
        ' ' +
        column?.id +
        'for text: ' +
        text,
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
      available: {},
    };
  }

  private isCourseCode(textContent: string, xPos: number): boolean {
    console.log(textContent);
    console.log(
      'isCourseCode: ' +
        textContent +
        'After transform : ' +
        this.courseCodeValidationPipe.transform(textContent) +
        xPos,
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
