import { Module } from '@nestjs/common';
import { ProgramScraperService } from './services/program-page/program-scraper.service';
import { CourseScraperService } from './services/course-page/course-scraper.service';
import { ScraperService } from './services/scraper.service';
import { ScraperController } from './scraper.controller';

const controllers = [];
if (process.env.NODE_ENV === 'development') {
  controllers.push(ScraperController);
}

@Module({
  controllers: controllers,
  providers: [ProgramScraperService, CourseScraperService, ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
