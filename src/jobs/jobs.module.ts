import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CheminotModule } from '../common/api-helper/cheminot/cheminot.module';
import { EtsModule } from '../common/api-helper/ets/ets.module';
import { PdfModule } from '../common/website-helper/pdf/pdf.module';
import { CourseModule } from '../course/course.module';
import { ProgramModule } from '../program/program.module';
import { ProgramCourseModule } from '../program-course/program-course.module';
import { SessionModule } from '../session/session.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { CoursesJobService } from './workers/courses.worker';
import { ProgramsJobService } from './workers/programs.worker';
import { SessionsJobService } from './workers/sessions.worker';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EtsModule,
    ProgramModule,
    CourseModule,
    ProgramCourseModule,
    CheminotModule,
    SessionModule,
    PdfModule,
  ],
  providers: [
    JobsService,
    ProgramsJobService,
    CoursesJobService,
    SessionsJobService,
  ],
  controllers: process.env.NODE_ENV === 'development' ? [JobsController] : [],
})
export class JobsModule {}
