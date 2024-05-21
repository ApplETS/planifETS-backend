import { Injectable } from '@nestjs/common';
import { ProgramScraperService } from './program-page/program-scraper.service';
import { CourseScraperService } from './course-page/course-scraper.service';

interface IProgram {}

@Injectable()
export class ScraperService {
  constructor(
    private readonly programScraperService: ProgramScraperService,
    private readonly courseScraperService: CourseScraperService,
  ) {}

  async scrapePrograms(): Promise<IProgram[]> {
    throw new Error('Method not implemented.');
  }

  async scrapeCourseDetails(courseCode: string) {
    throw new Error('Method not implemented.');
  }
}
