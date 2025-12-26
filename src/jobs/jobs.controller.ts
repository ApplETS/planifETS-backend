import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';

import { RunWorkersDto } from './dtos/run-workers.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Post('run-workers')

  @ApiBody({ type: RunWorkersDto })
  public async runWorkers(@Body() body: RunWorkersDto) {
    const {
      processAllJobs = true,
      processPrograms = false,
      processCourses = false,
      processCourseInstances = false,
      processProgramCourses = false,
      processSessions = false,
    } = body || {};

    if (processAllJobs) {
      await this.jobsService.processJobs();
      return { status: 'All jobs have been triggered' };
    }

    // Map flags to jobs
    const jobs: { service: string; method: string }[] = [];
    if (processPrograms) jobs.push({ service: 'ProgramsJobService', method: 'processPrograms' });
    if (processCourses) jobs.push({ service: 'CoursesJobService', method: 'processCourses' });
    if (processCourseInstances) jobs.push({ service: 'CourseInstancesJobService', method: 'processCourseInstances' });
    if (processProgramCourses) jobs.push({ service: 'CoursesJobService', method: 'syncCourseDetailsWithCheminotData' });
    if (processSessions) jobs.push({ service: 'SessionsJobService', method: 'processSessions' });

    if (jobs.length === 0) {
      return { status: 'No jobs triggered (no flags set)' };
    }

    const results = [];
    for (const job of jobs) {
      try {
        await this.jobsService.runWorker(job.service, job.method);
        results.push({ job, status: 'success' });
      } catch (error) {
        results.push({ job, status: 'error', error: (error instanceof Error ? error.message : String(error)) });
      }
    }
    return { status: 'Selected jobs processed', results };
  }
}
