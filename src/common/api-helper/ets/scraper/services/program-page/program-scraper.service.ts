import { Injectable } from '@nestjs/common';

import { CourseListScraperService } from './course-list-scraper.service';

@Injectable()
export class ProgramScraperService {
  public scrapePrograms(id: string) {
    this.scrapeProgramPage();
    throw new Error('Method not implemented.' + id);
  }

  private scrapeProgramPage() {
    const courseListService = new CourseListScraperService();
    throw new Error('Method not implemented.' + courseListService);
  }
}
