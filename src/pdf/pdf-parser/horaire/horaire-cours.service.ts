import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Output, Page, Text } from 'pdf2json';
import { firstValueFrom } from 'rxjs';

import { PdfParserUtil } from '../../../utils/pdf/parser/pdfParserUtil';
import { TextExtractor } from '../../../utils/pdf/parser/textExtractorUtil';
import { Group } from './Group';
import { HoraireCours } from './HoraireCours';
import { Period } from './Period';

@Injectable()
export class HoraireCoursService {
  private readonly END_PAGE_CONTENT_Y_AXIS = 59;
  private readonly PREALABLE_X_AXIS = 29.86;

  constructor(private httpService: HttpService) {}

  public async parsePdfFromUrl(pdfUrl: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(pdfUrl, { responseType: 'arraybuffer' }),
      );
      return await this.parseHoraireCoursPdf(
        Buffer.from(response.data),
        pdfUrl,
      );
    } catch (error) {
      throw new Error('Error fetching PDF from URL ' + error);
    }
  }

  // Parses the PDF buffer to extract course information
  private async parseHoraireCoursPdf(
    pdfBuffer: Buffer,
    pdfUrl: string,
  ): Promise<HoraireCours[]> {
    return PdfParserUtil.parsePdfBuffer(pdfBuffer, (pdfData) =>
      this.processPdfData(pdfData, pdfUrl),
    );
  }

  // Processes the raw PDF data to extract course information
  private processPdfData(pdfData: Output, pdfUrl: string): HoraireCours[] {
    try {
      const courses: HoraireCours[] = [];
      let currentCourse: HoraireCours = new HoraireCours();
      let currentGroupNumber = '';
      let periods: Period[] = [];

      pdfData.Pages.forEach((page: Page) => {
        const pageData = page.Texts;
        ({ currentCourse, currentGroupNumber, periods } = this.processPageData(
          pageData,
          currentCourse,
          currentGroupNumber,
          periods,
          courses,
        ));
      });

      if (currentCourse.code) {
        currentCourse.addOrUpdateCourse(courses);
      }

      if (courses.length === 0)
        throw new Error(`No courses found in the PDF located at ${pdfUrl}.`);

      return courses;
    } catch (err) {
      throw new Error('Error processing PDF data');
    }
  }

  private processPageData(
    pageData: Text[],
    currentCourse: HoraireCours,
    currentGroupNumber: string,
    periods: Period[],
    courses: HoraireCours[],
  ): {
    currentCourse: HoraireCours;
    currentGroupNumber: string;
    periods: Period[];
  } {
    pageData.forEach((textItem: Text) => {
      const {
        textContent: text,
        fontSize,
        xPos,
        yPos,
        bold,
      } = TextExtractor.extractTextDetails(textItem);

      if (!text || yPos > this.END_PAGE_CONTENT_Y_AXIS || bold) return;

      if (HoraireCours.isCourseCode(text, xPos)) {
        this.finalizeAndResetCourseAndGroup(
          currentCourse,
          currentGroupNumber,
          periods,
          courses,
        );
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
        this.finalizeCurrentGroup(currentCourse, currentGroupNumber, periods);
        currentGroupNumber = text;
      } else {
        periods = this.updatePeriods(currentGroupNumber, periods, xPos, text);
      }
    });

    this.finalizeCurrentGroup(currentCourse, currentGroupNumber, periods);
    return { currentCourse, currentGroupNumber, periods: [] };
  }

  private finalizeAndResetCourseAndGroup(
    currentCourse: HoraireCours,
    currentGroupNumber: string,
    periods: Period[],
    courses: HoraireCours[],
  ) {
    if (
      currentCourse.code &&
      currentGroupNumber &&
      periods.length > 0 &&
      !Period.isPeriodEmpty(periods[periods.length - 1])
    ) {
      currentCourse.finalizeGroup(currentGroupNumber, periods);
    }
    if (currentCourse.code) {
      currentCourse.addOrUpdateCourse(courses);
    }
  }

  private finalizeCurrentGroup(
    currentCourse: HoraireCours,
    currentGroupNumber: string,
    periods: Period[],
  ) {
    if (
      currentGroupNumber &&
      periods.length > 0 &&
      !Period.isPeriodEmpty(periods[periods.length - 1])
    ) {
      currentCourse.finalizeGroup(currentGroupNumber, periods);
    }
  }

  private updatePeriods(
    currentGroupNumber: string,
    periods: Period[],
    xPos: number,
    text: string,
  ): Period[] {
    if (!currentGroupNumber) return periods;

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
    return periods;
  }
}
