import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { EtsModule } from './common/api-helper/ets/ets.module';
import { PdfModule } from './common/website-helper/pdf/pdf.module';
import config from './config/configuration';
import { CourseModule } from './course/course.module';
import { CourseInstanceModule } from './course-instance/course-instance.module';
import { CoursePrerequisiteModule } from './course-prerequisite/course-prerequisite.module';
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
    HttpModule,
    PrismaModule,
    EtsModule,
    PdfModule,

    CourseModule,
    CourseInstanceModule,
    CoursePrerequisiteModule,
    SessionModule,
    ProgramModule,
  ],
  providers: [],
  controllers: [AppController],
  exports: [HttpModule],
})
export class AppModule {}
