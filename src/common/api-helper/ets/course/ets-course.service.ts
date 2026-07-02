import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cheerio, load } from 'cheerio';
import { Element } from 'domhandler';
import { firstValueFrom } from 'rxjs';

import { logHttpFetchFailure } from '@/common/utils/error/logHttpFetchFailure';
import { htmlFragmentToPlainText } from '@/common/utils/html/htmlFragmentToPlainText';
import {
  ETS_API_GET_ALL_COURSES,
  ETS_API_GET_COURSES_BY_IDS,
  ETS_USER_AGENT,
  getEtsCoursePageUrl,
} from '@/common/utils/url/url-constants';
import { extractNumberFromString } from '@/utils/stringUtil';

import { CourseByIdEtsApiDto } from './dtos/course-by-id-ets-api.dto';
import { CourseIndexResponseDto } from './dtos/course-index-response.dto';

interface ICourses {
  id: number;
  title: string;
  description: string;
  code: string;
  cycle: number | null;
}

export interface ICourseWithCredits extends ICourses {
  credits: number | null;
}

@Injectable()
export class EtsCourseService {
  private readonly logger = new Logger(EtsCourseService.name);

  constructor(private readonly httpService: HttpService) {}

  public async fetchAllCoursesWithCredits(): Promise<ICourseWithCredits[]> {
    const courses = await this.fetchAllCoursesWithoutCredits();

    // Fetch credits for all courses by their IDs in batches to avoid URI too long error
    const batchSize = 20; // Adjust batch size as needed
    const coursesWithCredits: ICourseWithCredits[] = [];

    for (let i = 0; i < courses.length; i += batchSize) {
      const batch = courses.slice(i, i + batchSize);
      const courseIds = batch.map((course) => course.id).join(',');
      const coursesFetchedById = await this.fetchCoursesById(courseIds);

      // Add credits to the courses in this batch
      const batchWithCredits = batch.map((course) => {
        const courseCreds = coursesFetchedById.find((cc) => cc.id === course.id);
        return {
          ...course,
          credits: courseCreds?.credits ?? null,
        };
      });

      coursesWithCredits.push(...batchWithCredits);

      // Add delay between batches to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
    }

    return coursesWithCredits;
  }

  //Fetches all courses without credits
  public async fetchAllCoursesWithoutCredits(): Promise<ICourses[]> {
    const response = await firstValueFrom(
      this.httpService.get(ETS_API_GET_ALL_COURSES, {
        headers: { 'User-Agent': ETS_USER_AGENT },
      }),
    );
    const raw = response.data as CourseIndexResponseDto;
    const courses = raw.results;

    if (!courses.length) {
      throw new Error('No courses fetched.');
    }

    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      code: course.code,
      cycle: course.cycle ? extractNumberFromString(course.cycle) : null,
    }));
  }

  // Fetches one or more courses by their ids
  // The ids are passed as a string with comma-separated values, ex: "349682,349710"
  public async fetchCoursesById(ids: string): Promise<CourseByIdEtsApiDto[]> {
    const response = await firstValueFrom(
      this.httpService.get(`${ETS_API_GET_COURSES_BY_IDS}${ids}`, {
        headers: { 'User-Agent': ETS_USER_AGENT },
      }),
    );
    const courses = response.data;

    if (!courses.length) {
      throw new Error('No courses fetched.');
    }

    return courses.map((course: CourseByIdEtsApiDto) => ({
      id: course.id,
      title: course.title,
      code: course.code,
      credits: course.credits,
    }));
  }

  public async fetchCourseDescriptionFromEtsWebsite(
    courseCode: string,
  ): Promise<string> {
    let html: string;

    try {
      const response = await firstValueFrom(
        this.httpService.get(getEtsCoursePageUrl(courseCode), {
          responseType: 'text',
          headers: { 'User-Agent': ETS_USER_AGENT },
          timeout: 10_000,
        }),
      );
      html = String(response.data);
    } catch (error) {
      logHttpFetchFailure(this.logger, 'ETS website', courseCode, error);
      throw error;
    }

    const descriptionSection = this.extractDescriptionSection(html, courseCode);
    const text = htmlFragmentToPlainText(descriptionSection);

    if (!text) {
      throw new Error('Could not extract course description from ETS website');
    }

    return text;
  }

  private extractDescriptionSection(
    html: string,
    courseCode: string,
  ): Cheerio<Element> {
    const $ = load(html);
    const pageContentDescription = $('#page-content .c-fold__text.o-text').first();
    const descriptionContainer =
      pageContentDescription.length > 0
        ? pageContentDescription
        : $('.c-fold__text.o-text').first();

    if (descriptionContainer.length === 0) {
      this.logger.warn(
        `No description section found for course ${courseCode}. Page title="${$('title').first().text().trim()}" bodySnippet="${$('body').text().trim().slice(0, 200).replaceAll(/\s+/g, ' ')}"`,
      );
      throw new Error('Could not extract course description from ETS website');
    }

    descriptionContainer.find('script, style, noscript').remove();

    return descriptionContainer;
  }
}
