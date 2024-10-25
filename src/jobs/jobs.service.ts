// src/jobs/jobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProgramsJobService } from './workers/programs.worker';
import { CoursesJobService } from './workers/courses.worker';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly programsJobService: ProgramsJobService,
    private readonly coursesJobService: CoursesJobService,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  public async processJobs(): Promise<void> {
    this.logger.log('Starting monthly job processing...');
    try {
      await this.programsJobService.processPrograms();
      await this.coursesJobService.processCourses();
      await this.coursesJobService.syncCourseDetailsWithCheminotData();
      this.logger.log('All jobs completed successfully!');
    } catch (error) {
      this.logger.error('Job processing error:', error);
    }
  }
}
