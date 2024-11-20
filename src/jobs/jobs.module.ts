import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CheminotModule } from '../common/api-helper/cheminot/cheminot.module';
import { EtsModule } from '../common/api-helper/ets/ets.module';
import { CourseCodeValidationPipe } from '../common/pipes/models/course/course-code-validation-pipe';
import { PdfModule } from '../common/website-helper/pdf/pdf.module';
import { CourseModule } from '../course/course.module';
import { PrerequisiteModule } from '../prerequisite/prerequisite.module';
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
    PrerequisiteModule,
    CourseModule,
    ProgramCourseModule,
    CheminotModule,
    SessionModule,
    PdfModule,
  ],
  providers: [
    CourseCodeValidationPipe,
    CoursesJobService,
    JobsService,
    ProgramsJobService,
    SessionsJobService,
  ],
  controllers: process.env.NODE_ENV === 'development' ? [JobsController] : [],
})
export class JobsModule {}
