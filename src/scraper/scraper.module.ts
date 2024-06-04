import { Module } from '@nestjs/common';
import { ProgramScraperService } from './services/program-page/program-scraper.service';
import { CourseScraperService } from './services/course-page/course-scraper.service';
import { ScraperService } from './services/scraper.service';
import { ScraperController } from './scraper.controller';
import { CourseListScraperService } from './services/program-page/course-list-scraper.service';

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
