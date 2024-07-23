import { Module } from '@nestjs/common';

import { ScraperController } from './scraper.controller';
import { CourseScraperService } from './services/course-page/course-scraper.service';
import { CourseListScraperService } from './services/program-page/course-list-scraper.service';
import { ProgramScraperService } from './services/program-page/program-scraper.service';
import { ScraperService } from './services/scraper.service';

@Module({
  imports: [],
  controllers: [ScraperController],
  providers: [
    ProgramScraperService,
    CourseScraperService,
    ScraperService,
    CourseListScraperService,
  ],
})
export class ScraperModule {}
