import { Controller, Get, Param } from '@nestjs/common';
import { ProgramScraperService } from './services/program-page/program-scraper.service';
import { CourseListScraperService } from './services/program-page/course-list-scraper.service';
import { CourseScraperService } from './services/course-page/course-scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly programScraperService: ProgramScraperService,
    private readonly courseListScraperService: CourseListScraperService,
    private readonly courseScraperService: CourseScraperService,
  ) {}

  @Get('program/:id')
  async scrapeProgram(@Param('id') id: string) {
    return this.programScraperService.scrapePrograms();
  }
}
