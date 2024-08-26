import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import {
  ETS_API_GET_ALL_COURSES,
  ETS_API_GET_COURSES_BY_IDS,
} from '../../../constants/url';

export interface IEtsCoursesData {
  id: number;
  title: string;
  code: string;
  cycle: string | null;
}

export interface IEtsCourse extends IEtsCoursesData {
  credits: string;
}

@Injectable()
export class EtsCourseService {
  constructor(private readonly httpService: HttpService) {}

  // Fetches all courses
  public async fetchAllCourses(): Promise<IEtsCoursesData[]> {
    const response = await firstValueFrom(
      this.httpService.get(ETS_API_GET_ALL_COURSES),
    );

    const courses = response.data.results;
    return courses.map((course: IEtsCoursesData) => ({
      id: course.id,
      title: course.title,
      code: course.code,
      cycle: course.cycle,
    }));
  }

  // Fetches one or more courses by their ids
  // The ids are passed as a string with comma-separated values, ex: "349682,349710"
  public async fetchCoursesById(ids: string): Promise<IEtsCourse[]> {
    const response = await firstValueFrom(
      this.httpService.get(`${ETS_API_GET_COURSES_BY_IDS}${ids}`),
    );

    const courses = response.data;
    return courses.map((course: IEtsCourse) => ({
      id: course.id,
      title: course.title,
      code: course.code,
      cycle: course.cycle,
      credits: course.credits,
    }));
  }
}
