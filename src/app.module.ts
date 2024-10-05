import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
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
import { CoursesProcessor } from './jobs/processors/courses.processor';
import { ProgramsProcessor } from './jobs/processors/programs.processor';
import { QueuesEnum } from './jobs/queues.enum';
import { QueuesService } from './jobs/queues.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProgramModule } from './program/program.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      connection: {
        host: config().redis.host,
        port: config().redis.port,
      },
    }),
    BullModule.registerQueue(
      { name: QueuesEnum.PROGRAMS },
      { name: QueuesEnum.COURSES },
    ),
    HttpModule,
    PrismaModule,
    CheminotModule,
    EtsModule,
    PdfModule,

    CourseModule,
    CourseInstanceModule,
    CoursePrerequisiteModule,
    SessionModule,
    ProgramModule,
  ],
  providers: [ProgramsProcessor, CoursesProcessor, QueuesService],
  controllers: [AppController],
  exports: [HttpModule, QueuesService],
})
export class AppModule {}
