import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Get('run-workers')
  async runWorkers() {
    await this.jobsService.processJobs();
    return { status: 'Jobs have been triggered' };
  }
}
