import { Injectable } from '@nestjs/common';

import { CourseListScraperService } from './course-list-scraper.service';

@Injectable()
export class ProgramScraperService {
  public scrapePrograms() {
    this.scrapeProgramPage();
    throw new Error('Method not implemented.');
  }

  private scrapeProgramPage() {
    const courseListService = new CourseListScraperService();
    throw new Error('Method not implemented.');
  }
}
