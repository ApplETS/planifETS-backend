import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import {
  ETS_API_GET_ALL_COURSES,
  ETS_API_GET_COURSES_BY_IDS,
} from '../../../constants/url';
import { extractNumberFromString } from '../../../utils/stringUtil';

export interface ICoursesEtsAPI {
  id: number;
  title: string;
  description: string;
  code: string;
  cycle: string | null;
}

export interface ICourseEtsAPI {
  id: number;
  title: string;
  code: string;
  credits: number | null;
}

export interface ICourses {
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
  constructor(private readonly httpService: HttpService) {}

  public async fetchAllCoursesWithCredits(): Promise<ICourseWithCredits[]> {
    const courses = await this.fetchAllCoursesWithoutCredits();

    // Fetch credits for all courses by their IDs
    const courseIds = courses.map((course) => course.id).join(',');
    const coursesFetchedById = await this.fetchCoursesById(courseIds);

    // Add credits to the courses
    return courses.map((course) => {
      const courseCreds = coursesFetchedById.find((cc) => cc.id === course.id);
      return {
        ...course,
        credits: courseCreds?.credits ?? null,
      };
    });
  }

  //Fetches all courses without credits
  public async fetchAllCoursesWithoutCredits(): Promise<ICourses[]> {
    const response = await firstValueFrom(
      this.httpService.get(ETS_API_GET_ALL_COURSES),
    );
    const courses = response.data.results;

    if (!courses.length) {
      throw new Error('No courses fetched.');
    }

    return courses.map((course: ICoursesEtsAPI) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      code: course.code,
      cycle: course.cycle ? extractNumberFromString(course.cycle) : null,
    }));
  }

  // Fetches one or more courses by their ids
  // The ids are passed as a string with comma-separated values, ex: "349682,349710"
  public async fetchCoursesById(ids: string): Promise<ICourseEtsAPI[]> {
    const response = await firstValueFrom(
      this.httpService.get(`${ETS_API_GET_COURSES_BY_IDS}${ids}`),
    );
    const courses = response.data;

    if (!courses.length) {
      throw new Error('No courses fetched.');
    }

    return courses.map((course: ICourseEtsAPI) => ({
      id: course.id,
      title: course.title,
      code: course.code,
      credits: course.credits,
    }));
  }
}
