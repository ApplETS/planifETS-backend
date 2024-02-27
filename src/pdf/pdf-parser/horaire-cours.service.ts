import PDFParser, { Page, Text } from 'pdf2json';
import {
  HoraireCourse,
  GroupPeriod,
  HorairePeriod,
} from './types/pdf-parser.types';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { writeDataToFile } from '../../utils/pdf/fileUtils';
import { firstValueFrom } from 'rxjs';
import { CourseCodeValidationPipe } from '../pipes/course-code-validation-pipe';

//TODO later: Scrape any courses. that way we'll ensure the accuracy of the title

@Injectable()
export class HoraireCoursService {
  private readonly COURS_X_AXIS = 0.551;
  private readonly PREALABLE_X_AXIS = 29.86;
  private readonly JOUR_X_AXIS = 5.447;
  private readonly GROUP_X_AXIS = 3.886;

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
          console.error(err.stack);
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
    try {
      const courses: HoraireCourse[] = [];
      let currentCourse: HoraireCourse = this.initializeCourse();
      let currentGroupNumber = '';
      let periods: HorairePeriod[] = []; // To accumulate periods for the current group

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

          if (this.isCourseCode(text, xPos)) {
            // Finalize the last group of the current course if necessary
            if (
              currentCourse.code &&
              currentGroupNumber &&
              !this.isPeriodEmpty(periods[periods.length - 1])
            ) {
              this.finalizeCurrentGroup(
                currentCourse,
                currentGroupNumber,
                periods,
              );
              periods = [];
            }
            if (currentCourse.code) {
              this.addOrUpdateCourse(courses, currentCourse);
            }
            currentCourse = this.initializeCourse();
            currentCourse.code = text;
            currentGroupNumber = '';
          } else if (this.isTitle(text, fontSize)) {
            currentCourse.title += currentCourse.title ? ' ' + text : text;
          } else if (xPos === this.PREALABLE_X_AXIS) {
            currentCourse.prerequisites += currentCourse.prerequisites
              ? ' ' + text
              : text;
          } else if (this.isGroupNumber(text, xPos)) {
            // Finalize the previous group if necessary
            if (
              currentGroupNumber &&
              periods.length > 0 &&
              !this.isPeriodEmpty(periods[periods.length - 1])
            ) {
              this.finalizeCurrentGroup(
                currentCourse,
                currentGroupNumber,
                periods,
              );
              periods = [];
            }
            currentGroupNumber = text;
          } else if (currentGroupNumber) {
            if (
              xPos === this.JOUR_X_AXIS &&
              /^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)$/.test(text)
            ) {
              if (
                periods.length === 0 ||
                !this.isPeriodEmpty(periods[periods.length - 1])
              ) {
                periods.push(this.initializePeriod());
              }
            } else {
              if (periods.length === 0) {
                periods.push(this.initializePeriod());
              }
            }
            this.handleGroupDetails(text, xPos, periods[periods.length - 1]);
          }
        });

        // Finalize the last group of the last course on the page
        if (currentGroupNumber) {
          this.finalizeCurrentGroup(currentCourse, currentGroupNumber, periods);
          periods = [];
        }
      });

      if (currentCourse.code) {
        this.addOrUpdateCourse(courses, currentCourse);
      }

      return courses;
    } catch (error) {
      console.error('An error occurred:', error);
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

  private isCourseCode(text: string, xPos: number): boolean {
    return (
      this.courseCodeValidationPipe.transform(text) && xPos == this.COURS_X_AXIS
    );
  }

  private addOrUpdateCourse(
    courses: HoraireCourse[],
    newCourse: HoraireCourse,
  ): void {
    const existingCourseIndex = courses.findIndex(
      (course) => course.code === newCourse.code,
    );
    if (existingCourseIndex !== -1) {
      const existingCourse = courses[existingCourseIndex];
      Object.entries(newCourse.groups).forEach(([groupNumber, periods]) => {
        if (!existingCourse.groups[groupNumber]) {
          existingCourse.groups[groupNumber] = [];
        }
        existingCourse.groups[groupNumber].push(...periods);
      });
    } else {
      courses.push(newCourse);
    }
  }

  private handleGroupDetails(
    text: string,
    xPos: number,
    currentPeriod: HorairePeriod,
  ) {
    if (!currentPeriod) return;

    const detailType = this.getPeriodDetailType(text);

    if (detailType) {
      currentPeriod[detailType] = text;
    }
  }

  private getPeriodDetailType(text: string): string {
    if (/^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)$/.test(text)) {
      return 'day';
    } else if (/^\d{2}:\d{2} - \d{2}:\d{2}$/.test(text)) {
      return 'time';
    } else if (/^(\p{L}\.)+\s.+$/u.test(text)) {
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
      return 'mode';
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

  private initializePeriod(): HorairePeriod {
    return {
      day: '',
      time: '',
      activity: '',
      teacher: '',
      local: '',
      mode: '',
      dateRange: '',
    };
  }

  private finalizeCurrentGroup(
    course: HoraireCourse,
    groupNumber: string,
    periods: HorairePeriod[],
  ): void {
    if (!course.groups[groupNumber]) {
      course.groups[groupNumber] = [];
    }
    //Check if the period is not empty
    if (periods.length > 0) {
      course.groups[groupNumber].push(...periods);
    } else {
      console.error('Periods are empty');
    }
  }

  private finalizeCurrentCourse(
    courses: HoraireCourse[],
    currentCourse: HoraireCourse,
    currentGroupNumber: string,
    currentPeriod: HorairePeriod,
  ) {
    if (currentCourse.code) {
      if (currentGroupNumber) {
        this.addPeriodToGroup(currentCourse, currentGroupNumber, currentPeriod);
      }
      //Add if (xPos == this.COURS_X_AXIS)
      this.addOrUpdateCourse(courses, currentCourse);
    }
  }

  private isPeriodEmpty(period: HorairePeriod): boolean {
    return !Object.values(period).some(
      (value) => value !== '' && value != null,
    );
  }

  private addPeriodToGroup(
    course: HoraireCourse,
    groupNumber: string,
    period: HorairePeriod,
  ): void {
    if (!course.groups[groupNumber]) {
      course.groups[groupNumber] = [];
    }
    if (
      !this.isPeriodExistsInGroup(course.groups[groupNumber], period) &&
      !this.isPeriodEmpty(period)
    ) {
      console.log('Adding period to group', period);
      course.groups[groupNumber].push({ ...period });
    }
  }

  private isTitle(text: string, fontSize: number): boolean {
    return (
      fontSize === this.TITLE_FONT_SIZE &&
      text == text.toUpperCase() &&
      text != text.toLowerCase()
    );
  }

  private isPeriodExistsInGroup(
    group: GroupPeriod[],
    period: GroupPeriod,
  ): boolean {
    return group.some(
      (existingPeriod) =>
        existingPeriod.day === period.day &&
        existingPeriod.time === period.time &&
        existingPeriod.activity === period.activity &&
        existingPeriod.teacher === period.teacher &&
        existingPeriod.local === period.local &&
        existingPeriod.mode === period.mode &&
        existingPeriod.dateRange === period.dateRange,
    );
  }

  private isGroupNumber(text: string, xPos: number) {
    return xPos === this.GROUP_X_AXIS && /^\d{2}$/.test(text);
  }
}
