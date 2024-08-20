import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { QueuesEnum } from '../queues.enum';

@Processor(QueuesEnum.COURSES)
export class CoursesProcessor extends WorkerHost {
  public async process(job: Job): Promise<void> {
    console.log('Processing courses:', job.data);
    //TODO: Implement the processing logic here
  }
}
