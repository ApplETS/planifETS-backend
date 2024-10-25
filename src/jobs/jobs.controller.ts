import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Get('run-workers')
  async runWorkers() {
    return await this.jobsService.processJobs();
  }
}
