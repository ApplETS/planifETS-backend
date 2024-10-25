import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { CheminotModule } from './common/api-helper/cheminot/cheminot.module';
import { EtsModule } from './common/api-helper/ets/ets.module';
import { PdfModule } from './common/website-helper/pdf/pdf.module';
import config from './config/configuration';
import { CourseModule } from './course/course.module';
import { CourseInstanceModule } from './course-instance/course-instance.module';
import { CoursePrerequisiteModule } from './course-prerequisite/course-prerequisite.module';
import { CoursesJobService } from './jobs/workers/courses.worker';
import { ProgramsJobService } from './jobs/workers/programs.worker';
import { JobsService } from './jobs/jobs.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProgramModule } from './program/program.module';
import { ProgramCourseModule } from './program-course/program-course.module';
import { SessionModule } from './session/session.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: '.env',
    }),
    HttpModule,
    PrismaModule,
    CheminotModule,
    EtsModule,
    PdfModule,
    JobsModule,

    CourseModule,
    CourseInstanceModule,
    CoursePrerequisiteModule,
    SessionModule,
    ProgramModule,
    ProgramCourseModule,
  ],
  providers: [ProgramsJobService, CoursesJobService, JobsService],
  controllers: [AppController],
  exports: [HttpModule, JobsService],
})
export class AppModule {}
