import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { JobsModule } from './jobs.module';

// Keep scheduler registration out of JobsModule because 
// workers bootstrap JobsModule directly and should not initialize @Cron/@Timeout handlers.
@Module({
  imports: [
    ScheduleModule.forRoot(),
    JobsModule,
  ],
})
export class JobsSchedulerModule {}
