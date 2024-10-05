import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { QueuesService } from './jobs/queues.service';

@Controller()
export class AppController {
  constructor(private readonly queuesService: QueuesService) {}
  @Get()
  @ApiOperation({
    summary: 'Hello World',
  })
  public getHello(): string {
    return 'Hello World!';
  }

  //For test purposes
  @Get('process')
  @ApiOperation({
    summary: 'Trigger the queue to process jobs',
  })
  public async triggerProcessJobs() {
    await this.queuesService.processJobs();
  }
}
