import { Injectable } from '@nestjs/common';

@Injectable()
export class CourseScraperService {
  public scrapeCourseDetails(courseCode: string) {
    throw new Error('Method not implemented.' + courseCode);
  }
}
