import { Module } from '@nestjs/common';

import { CheminotModule } from '../common/api-helper/cheminot/cheminot.module';
import { EtsModule } from '../common/api-helper/ets/ets.module';
import { PdfModule } from '../common/website-helper/pdf/pdf.module';
import { CourseModule } from '../course/course.module';
import { CourseInstanceModule } from '../course-instance/course-instance.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { PrerequisiteModule } from '../prerequisite/prerequisite.module';
import { ProgramModule } from '../program/program.module';
import { ProgramCourseModule } from '../program-course/program-course.module';
import { SessionModule } from '../session/session.module';
import { jobWorkerProviders } from './jobs.constants';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    MonitoringModule,
    CourseModule,
    CourseInstanceModule,
    PrerequisiteModule,
    ProgramModule,
    ProgramCourseModule,
    SessionModule,

    CheminotModule,
    EtsModule,
    PdfModule,
  ],
  providers: [
    JobsService,
    ...jobWorkerProviders,
  ],
  controllers: process.env.APP_ENV === 'development' ? [JobsController] : [], // Only expose in dev mode for running jobs manually
  exports: [JobsService],
})
export class JobsModule {}
