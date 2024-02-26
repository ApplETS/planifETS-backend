import PDFParser, { Page, Text } from 'pdf2json';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { writeDataToFile } from '../../utils/pdf/fileUtils';
import { firstValueFrom } from 'rxjs';
import { CourseCodeValidationPipe } from '../pipes/course-code-validation-pipe';
import {
  HoraireCourse,
  GroupPeriod,
  HorairePeriod,
} from './types/pdf-parser.types';

//FIXME: Fix groups periods parsing. Some periods are missing.
//fontsize? xPos? idk

//TODO : Scrape any courses. that way we'll ensure the accuracy of the title

@Injectable()
export class HoraireCoursService {
  private readonly COURS_X_AXIS = 0.551;
  private readonly PREALABLE_X_AXIS = 29.86;
  private readonly TITLE_FONT_SIZE = 10.998999999999999;
  private readonly START_PAGE_CONTENT_Y_AXIS = 14.019;
  private readonly END_PAGE_CONTENT_Y_AXIS = 59;

  courseCodeValidationPipe = new CourseCodeValidationPipe();

  constructor(private httpService: HttpService) {}

  async parsePdfFromUrl(pdfUrl: string): Promise<any> {
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
  async parseHoraireCoursPdf(pdfBuffer: Buffer): Promise<any> {
    const parser = new PDFParser();

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
          await writeDataToFile(pdfData, 'inputHoraire.json');
          const courses = this.processPdfData(null, pdfData);
          await writeDataToFile(courses, 'coursesHoraire.json');
          resolve(courses);
        } catch (error) {
          reject(error);
        }
      });
      parser.parseBuffer(pdfBuffer);
    });
  }

  // Processes the raw PDF data to extract course information
  private processPdfData(err: null | Error, pdfData: any): HoraireCourse[] {
    const courses: HoraireCourse[] = [];
    let currentCourse: HoraireCourse = this.initializeCourse();

    let currentGroupNumber = '';
    let currentPeriod: HorairePeriod = {
      day: '',
      time: '',
      activity: '',
      teacher: '',
      local: '',
      teachingMethod: '',
      dateRange: '',
    };

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

        if (
          !text ||
          // yPos < this.START_PAGE_CONTENT_Y_AXIS ||
          yPos > this.END_PAGE_CONTENT_Y_AXIS ||
          bold
        ) {
          return;
        }

        if (this.isCourseCode(text, xPos)) {
          //Check if the course is already in the courses array
          if (currentCourse.code) {
            if (currentGroupNumber) {
              this.addPeriodToGroup(
                currentCourse,
                currentGroupNumber,
                currentPeriod,
              );
            }
            if (xPos == this.COURS_X_AXIS)
              this.addOrUpdateCourse(courses, currentCourse);
          }
          currentCourse = {
            code: text,
            title: '',
            prerequisites: '',
            groups: {},
          };
          currentGroupNumber = '';
          currentPeriod = {
            day: '',
            time: '',
            activity: '',
            teacher: '',
            local: '',
            teachingMethod: '',
            dateRange: '',
          };

          //Get the title based on font size
        } else if (this.isTitle(text, fontSize)) {
          if (currentCourse.title) {
            currentCourse.title += ' ' + text;
          } else {
            currentCourse.title = text;
          }
          //Get the prerequisites
        } else if (xPos === this.PREALABLE_X_AXIS) {
          // Check if the text is a prerequisite
          if (currentCourse.prerequisites) {
            currentCourse.prerequisites += ' ' + text; // Append the new prerequisites with a space
          } else {
            currentCourse.prerequisites = text;
          }
        } else if (this.isGroupNumber(text)) {
          if (currentGroupNumber && Object.keys(currentPeriod).length > 0) {
            this.addPeriodToGroup(
              currentCourse,
              currentGroupNumber,
              currentPeriod,
            );
          }
          currentGroupNumber = text;
          currentPeriod = {};
        } else if (currentGroupNumber) {
          this.handleGroupDetails(text, currentPeriod);
          const detailType = this.getDetailType(text);
          if (detailType) {
            currentPeriod[detailType] = text;
          }
        }
      });

      // Handle the last course after processing all pages
      this.finalizeCourse(
        courses,
        currentCourse,
        currentGroupNumber,
        currentPeriod,
      );
    });

    console.log('Total courses: ' + courses.length);
    return courses;
  }

  private extractTextDetails(textItem: Text) {
    const textContent = decodeURIComponent(textItem.R[0].T).trim();
    const fontSize = textItem.R[0].TS[1];
    const bold = textItem.R[0].TS[2];
    const xPos = textItem.x;
    const yPos = textItem.y;
    return { textContent, fontSize, bold, xPos, yPos };
  }

  private isCourseCode(textContent: string, xPos: number): boolean {
    return (
      this.courseCodeValidationPipe.transform(textContent) &&
      xPos == this.COURS_X_AXIS
    );
  }

  private addOrUpdateCourse(
    courses: HoraireCourse[],
    newCourse: HoraireCourse,
  ): void {
    // Check if course already exists in the courses array
    const existingCourseIndex = courses.findIndex(
      (course) => course.code === newCourse.code,
    );

    if (existingCourseIndex !== -1) {
      // Merge groups for existing course
      const existingCourse = courses[existingCourseIndex];
      for (const groupNumber in newCourse.groups) {
        if (existingCourse.groups[groupNumber]) {
          existingCourse.groups[groupNumber].push(
            ...newCourse.groups[groupNumber],
          );
        } else {
          existingCourse.groups[groupNumber] = newCourse.groups[groupNumber];
        }
      }
    } else {
      // Add new course to courses
      courses.push(newCourse);
    }
  }

  private handleGroupDetails(
    textContent: string,
    currentPeriod: HorairePeriod,
  ) {
    const detailType = this.getDetailType(textContent);
    if (detailType) {
      currentPeriod[detailType] = textContent;
    }
  }

  private getDetailType(text: string): string {
    if (/^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)$/.test(text)) {
      return 'day';
    } else if (/^\d{2}:\d{2} - \d{2}:\d{2}$/.test(text)) {
      return 'time';
    } else if (/\b[A-Z]\.\s.+/.test(text)) {
      return 'teacher';
    } else if (/[A-Z]-\d{4}/.test(text)) {
      return 'local';
    } else if (
      /(Labo A|Labo B|Labo C|Labo D|Labo(?: A\+B)?|Labo\/2|\bC\b|Atelier|TP\/Labo|TP\/2|TP(?: A\+B| A| B| C| D)?|TP-Labo\/2|TP-Labo (?:A|B|C|D)|Projet)/.test(
        text,
      )
    ) {
      return 'activity';
    } else if (/^(P|D|C|H)$/.test(text)) {
      return 'teachingMethod';
    } else if (
      //expects "19 septembre au 26 septembre 2022" OR "06 septembre 2022" OR "6 septembre 2022"
      /\b(?:1er|0?[1-9]|[12][0-9]|3[01])\s(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s\d{4}\b/.test(
        text,
      )
    ) {
      return 'dateRange';
    }
  }

  private initializeCourse(): HoraireCourse {
    return {
      code: '',
      title: '',
      prerequisites: '',
      groups: {},
    };
  }

  private finalizeCourse(
    courses: HoraireCourse[],
    currentCourse: HoraireCourse,
    currentGroupNumber: string,
    currentPeriod: HorairePeriod,
  ) {
    if (currentCourse.code) {
      if (currentGroupNumber) {
        this.addPeriodToGroup(currentCourse, currentGroupNumber, currentPeriod);
      }
      this.addOrUpdateCourse(courses, currentCourse);
    }
  }

  private addPeriodToGroup(
    course: HoraireCourse,
    groupNumber: string,
    period: HorairePeriod,
  ): void {
    if (!course.groups[groupNumber]) {
      course.groups[groupNumber] = [];
    }
    if (!this.isPeriodInGroup(course.groups[groupNumber], period)) {
      course.groups[groupNumber].push({ ...period });
    }
  }

  private isTitle(text: string, fontSize: number): boolean {
    return fontSize === this.TITLE_FONT_SIZE;
  }

  private isPeriodInGroup(group: GroupPeriod[], period: GroupPeriod): boolean {
    return group.some(
      (groupPeriod) => JSON.stringify(groupPeriod) === JSON.stringify(period),
    );
  }

  private isGroupNumber(text: string) {
    return /^\d{2}$/.test(text);
  }
}
