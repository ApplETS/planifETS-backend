import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { CheminotModule } from './common/api-helper/cheminot/cheminot.module';
import { EtsModule } from './common/api-helper/ets/ets.module';
import { PdfModule } from './common/website-helper/pdf/pdf.module';
import { CourseModule } from './course/course.module';
import { CourseInstanceModule } from './course-instance/course-instance.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { JobsSchedulerModule } from './jobs/jobs-scheduler.module';
import { LlmGenerationModule } from './llm-generation/llm-generation.module';
import { MonitoringModule } from './monitoring/monitoring.module';
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
    JobsSchedulerModule,
    MonitoringModule,

    // CRUD modules
    CourseModule,
    CourseInstanceModule,
    PrerequisiteModule,
    SessionModule,
    ProgramModule,
    ProgramCourseModule,
    EmbeddingModule,
    LlmGenerationModule,
  ],
  controllers: [AppController],
  exports: [HttpModule],
})
export class AppModule {}
