import { Controller, Get, Param } from '@nestjs/common';

import { CourseScraperService } from './services/course-page/course-scraper.service';
import { CourseListScraperService } from './services/program-page/course-list-scraper.service';
import { ProgramScraperService } from './services/program-page/program-scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly programScraperService: ProgramScraperService,
    private readonly courseListScraperService: CourseListScraperService,
    private readonly courseScraperService: CourseScraperService,
  ) {}

  @Get('program/:id')
  async scrapeProgramPage(@Param('id') id: string) {
    return this.programScraperService.scrapePrograms();
  }
}
