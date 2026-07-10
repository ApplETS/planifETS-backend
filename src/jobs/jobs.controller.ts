import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';

import { RunWorkersDto } from './dtos/run-workers.dto';
import { JobsService } from './jobs.service';

type JobDefinition = {
  service: string;
  method: string;
};

type JobFlag =
  | 'processPrograms'
  | 'processCourses'
  | 'processCourseDescriptions'
  | 'processCourseInstances'
  | 'processProgramCourses'
  | 'processSessions'
  | 'processCourseEmbeddings';

type JobFlagMapping = {
  flag: JobFlag;
  job: JobDefinition;
};

type JobResult =
  | {
      job: JobDefinition;
      status: 'success';
    }
  | {
      job: JobDefinition;
      status: 'skipped';
      reason: string;
    }
  | {
      job: JobDefinition;
      status: 'error';
      error: string;
    };

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  private readonly jobMappings: JobFlagMapping[] = [
    {
      flag: 'processPrograms',
      job: { service: 'ProgramsJobService', method: 'processPrograms' }
    },
    {
      flag: 'processCourses',
      job: { service: 'CoursesJobService', method: 'processCourses' }
    },
    {
      flag: 'processCourseDescriptions',
      job: {
        service: 'CoursesJobService',
        method: 'syncCourseDescriptionsFromEtsWebsite'
      }
    },
    {
      flag: 'processCourseInstances',
      job: {
        service: 'CourseInstancesJobService',
        method: 'processCourseInstances'
      }
    },
    {
      flag: 'processProgramCourses',
      job: {
        service: 'CoursesJobService',
        method: 'syncCourseDetailsWithCheminotData'
      }
    },
    {
      flag: 'processSessions',
      job: { service: 'SessionsJobService', method: 'processSessions' }
    },
    {
      flag: 'processCourseEmbeddings',
      job: { service: 'CourseEmbeddingIndexerService', method: 'run' }
    }
  ];

  constructor(private readonly jobsService: JobsService) {}

  @Post('run-workers')
  @ApiBody({ type: RunWorkersDto })
  public async runWorkers(@Body() body: RunWorkersDto) {
    const request = body ?? {};

    if (request.processAllJobs ?? true) {
      await this.jobsService.processJobs();
      return { status: 'All jobs have been triggered' };
    }

    const jobs = this.getSelectedJobs(request);

    if (jobs.length === 0) {
      return { status: 'No jobs triggered (no flags set)' };
    }

    const results = await this.runSelectedJobs(jobs);

    return { status: 'Selected jobs processed', results };
  }

  private getSelectedJobs(body: RunWorkersDto): JobDefinition[] {
    return this.jobMappings
      .filter(({ flag }) => body[flag])
      .map(({ job }) => job);
  }

  private async runSelectedJobs(jobs: JobDefinition[]): Promise<JobResult[]> {
    const results: JobResult[] = [];

    for (const job of jobs) {
      results.push(await this.runSelectedJob(job));
    }

    return results;
  }

  private async runSelectedJob(job: JobDefinition): Promise<JobResult> {
    if (!this.jobsService.canRunJob(job.service, job.method)) {
      return {
        job,
        status: 'skipped',
        reason: 'CHATBOT_ENABLED=false'
      };
    }

    try {
      await this.jobsService.runWorker(job.service, job.method);
      return { job, status: 'success' };
    } catch (error) {
      return {
        job,
        status: 'error',
        error: this.getErrorMessage(error)
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
