import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { CoursesProcessor } from './processors/courses.processor';
import { ProgramsProcessor } from './processors/programs.processor';
import { QueuesEnum } from './queues.enum';
import { QueuesService } from './queues.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueuesEnum.PROGRAMS },
      { name: QueuesEnum.COURSES },
    ),
  ],
  providers: [ProgramsProcessor, CoursesProcessor, QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
