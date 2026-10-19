import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Output, Page, Text } from 'pdf2json';
import { firstValueFrom } from 'rxjs';

import { isAxiosError } from '@/utils/error/errorUtil';
import { PdfParserUtil } from '@/utils/pdf/parser/pdfParserUtil';
import { TextExtractor } from '@/utils/pdf/parser/textExtractorUtil';

import { Group } from './Group';
import { HoraireCours } from './HoraireCours';
import { Period } from './Period';

@Injectable()
export class HoraireCoursService {
  private readonly END_PAGE_CONTENT_Y_AXIS = 59;
  private readonly PREALABLE_X_AXIS = 29.86;

  constructor(private readonly httpService: HttpService) {}

  private readonly logger = new Logger(HoraireCoursService.name);

  public async parsePdfFromUrl(pdfUrl: string): Promise<HoraireCours[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(pdfUrl, { responseType: 'arraybuffer' })
      );

      this.logger.debug(`Fetched PDF from URL ${pdfUrl}`);
      if (response.status !== HttpStatus.OK) {
        this.logger.error(
          `Failed to fetch PDF from URL ${pdfUrl}. Status code: ${response.status}`
        );
      }

      return await this.parseHoraireCoursPdf(
        Buffer.from(response.data),
        pdfUrl
      );
    } catch (error) {
      if (isAxiosError(error) && error.response?.status) {
        throw error;
      }
      throw new Error('Error fetching PDF from URL ' + String(error));
    }
  }

  // Parses the PDF buffer to extract course information
  public async parseHoraireCoursPdf(
    pdfBuffer: Buffer,
    pdfUrl: string
  ): Promise<HoraireCours[]> {
    return PdfParserUtil.parsePdfBuffer(pdfBuffer, (pdfData) =>
      this.processPdfData(pdfData, pdfUrl)
    );
  }

  // Processes the raw PDF data to extract course information
  private processPdfData(pdfData: Output, pdfUrl: string): HoraireCours[] {
    try {
      const expectedCodes = this.validateHorairePdfData(pdfData, pdfUrl);
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
          courses
        ));
      });

      if (currentCourse.code) {
        currentCourse.addOrUpdateCourse(courses);
      }

      if (courses.length === 0)
        throw new Error(`No courses found in the PDF located at ${pdfUrl}.`);

      const parsedCodes = new Set(courses.map((course) => course.code));
      const missing = [...expectedCodes].filter(
        (code) => !parsedCodes.has(code)
      );
      if (missing.length) {
        throw new Error(`Course rows not parsed: [${missing.join(', ')}].`);
      }

      const serializedCourses: HoraireCours[] = courses.map((course) =>
        course.serialize()
      ) as unknown as HoraireCours[];

      return serializedCourses;
    } catch (err) {
      this.logger.error(
        `Invalid schedule PDF ${pdfUrl}: ${String(err)}. Synchronization skipped; existing data preserved.`
      );
      throw new Error('Error processing PDF data: ' + err);
    }
  }

  private validateHorairePdfData(pdfData: Output, pdfUrl: string): Set<string> {
    if (!pdfData.Pages?.length)
      throw new Error('Document has no readable pages.');
    const codes = new Set<string>();
    const session = /HorairePublication_(\d{4})([123])_/.exec(pdfUrl);
    const season = session
      ? ['', 'HIVER', 'ÉTÉ', 'AUTOMNE'][Number(session[2])]
      : null;
    let documentSession: string | undefined;
    pdfData.Pages.forEach((page, index) => {
      const texts = page.Texts.map((item) => ({
        item,
        text: decodeURIComponent(item.R.map((run) => run.T).join('')).trim()
      }));
      const fail = (reason: string): never => {
        throw new Error(`Page ${index + 1}/${pdfData.Pages.length}: ${reason}`);
      };
      const heading = texts.find(({ text }) =>
        /^HORAIRE (HIVER|ÉTÉ|AUTOMNE) \d{4}$/.test(text)
      );
      if (!heading) fail('missing session heading (empty or unreadable page).');
      if (session && heading!.text !== `HORAIRE ${season} ${session[1]}`)
        fail('session heading does not match requested URL.');
      if (documentSession && heading!.text !== documentSession)
        fail('session differs from preceding pages.');
      documentSession = heading!.text;
      const column = texts.find(({ text }) => text === 'COURS');
      if (
        !column ||
        !['GR', 'HEURE'].every((label) =>
          texts.some(({ text }) => text === label)
        )
      )
        fail('missing course table headers.');
      const footer = texts.find(({ text }) =>
        /^Page\s*:\s*\d+\s*\/\s*\d+$/.test(text)
      );
      const numbers = footer?.text.match(/\d+/g)?.map(Number);
      if (
        !numbers ||
        numbers[0] !== index + 1 ||
        numbers[1] !== pdfData.Pages.length
      )
        fail('missing or inconsistent page numbering.');
      // Scan the whole code column, independently of parser font and exact-x filters.
      const codeColumn = texts.filter(
        ({ item }) =>
          item.y > column!.item.y &&
          item.y <= this.END_PAGE_CONTENT_Y_AXIS &&
          item.x < 2
      );
      for (const { text } of codeColumn) {
        if (/^[A-Z]{3}\d/.test(text)) {
          if (!/^[A-Z]{3}\d{3,4}$/.test(text))
            fail(`unrecognized course row "${text}".`);
          codes.add(text);
        }
      }
    });
    if (!codes.size)
      throw new Error(
        'No course rows detected; empty schedule is not evidence of no offerings.'
      );
    return codes;
  }

  private processPageData(
    pageData: Text[],
    currentCourse: HoraireCours,
    currentGroupNumber: string,
    periods: Period[],
    courses: HoraireCours[]
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
        bold
      } = TextExtractor.extractTextDetails(textItem);

      if (!text || yPos > this.END_PAGE_CONTENT_Y_AXIS || bold) return;

      if (HoraireCours.isCourseCode(text, xPos)) {
        this.finalizeAndResetCourseAndGroup(
          currentCourse,
          currentGroupNumber,
          periods,
          courses
        );

        //Reset course
        currentCourse = new HoraireCours();
        currentCourse.code = text;
        currentGroupNumber = '';
        periods = [];
      } else if (HoraireCours.isTitle(text, fontSize)) {
        currentCourse.title += currentCourse.title ? ' ' + text : text;
      } else if (xPos === this.PREALABLE_X_AXIS) {
        currentCourse.prerequisites += currentCourse.prerequisites
          ? ' ' + text
          : text;
      } else if (Group.isGroupNumber(text, xPos)) {
        this.finalizeCurrentGroup(currentCourse, currentGroupNumber, periods);
        currentGroupNumber = text;

        //Reset periods
        periods = [];
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
    courses: HoraireCours[]
  ) {
    if (
      currentCourse.code &&
      currentGroupNumber &&
      periods.length > 0 &&
      !Period.isPeriodEmpty(periods.at(-1)!)
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
    periods: Period[]
  ) {
    if (
      currentGroupNumber &&
      periods.length > 0 &&
      !Period.isPeriodEmpty(periods.at(-1)!)
    ) {
      currentCourse.finalizeGroup(currentGroupNumber, periods);
    }
  }

  private updatePeriods(
    currentGroupNumber: string,
    periods: Period[],
    xPos: number,
    text: string
  ): Period[] {
    if (!currentGroupNumber) return periods;

    if (xPos === Period.JOUR_X_AXIS && Period.isDay(text)) {
      if (periods.length === 0 || !Period.isPeriodEmpty(periods.at(-1)!)) {
        periods.push(new Period());
      }
    } else if (periods.length === 0) {
      periods.push(new Period());
    }

    periods.at(-1)!.handlePeriodDetailTypes(text);
    return periods;
  }
}
