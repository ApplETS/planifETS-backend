import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { QueuesEnum } from '../queues.enum';

@Processor(QueuesEnum.PROGRAMS)
export class ProgramsProcessor extends WorkerHost {
  public async process(job: Job): Promise<void> {
    console.log('Processing programs:', job.data);
    //TODO: Implement the processing logic here
  }
}
