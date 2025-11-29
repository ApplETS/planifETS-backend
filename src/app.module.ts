import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_FILTER } from "@nestjs/core";
import { SentryModule } from "@sentry/nestjs/setup";
import { SentryGlobalFilter } from "@sentry/nestjs/setup";

import { AppController } from './app.controller';
import { CheminotModule } from './common/api-helper/cheminot/cheminot.module';
import { EtsModule } from './common/api-helper/ets/ets.module';
import { PdfModule } from './common/website-helper/pdf/pdf.module';
import { CourseModule } from './course/course.module';
import { CourseInstanceModule } from './course-instance/course-instance.module';
import { JobsModule } from './jobs/jobs.module';
import { JobsService } from './jobs/jobs.service';
import { PrerequisiteModule } from './prerequisite/prerequisite.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgramModule } from './program/program.module';
import { ProgramCourseModule } from './program-course/program-course.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    CheminotModule,
    EtsModule,
    PdfModule,
    JobsModule,

    // CRUD modules
    CourseModule,
    CourseInstanceModule,
    PrerequisiteModule,
    SessionModule,
    ProgramModule,
    ProgramCourseModule,

    SentryModule.forRoot()
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    JobsService
  ],
  controllers: [AppController],
  exports: [HttpModule, JobsService],
})
export class AppModule { }
