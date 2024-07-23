import { Injectable } from '@nestjs/common';

import { CourseScraperService } from './course-page/course-scraper.service';
import { ProgramScraperService } from './program-page/program-scraper.service';

interface IProgram {}

@Injectable()
export class ScraperService {
  constructor(
    private readonly programScraperService: ProgramScraperService,
    private readonly courseScraperService: CourseScraperService,
  ) {}

  public async scrapePrograms(): Promise<IProgram[]> {
    throw new Error('Method not implemented.');
  }

  public async scrapeCourseDetails(courseCode: string) {
    throw new Error('Method not implemented.');
  }
}