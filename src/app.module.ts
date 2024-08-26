import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { EtsController } from './common/api-helper/ets/ets.controller';
import { EtsModule } from './common/api-helper/ets/ets.module';
import { FileUtil } from './common/utils/pdf/fileUtil';
import { PdfController } from './common/website-helper/pdf/pdf.controller';
import { HoraireCoursService } from './common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from './common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import config from './config/configuration';
import { CourseController } from './course/course.controller';
import { CourseModule } from './course/course.module';
import { CourseService } from './course/course.service';
import { CourseInstanceController } from './course-instance/course-instance.controller';
import { CourseInstanceModule } from './course-instance/course-instance.module';
import { CourseInstanceService } from './course-instance/course-instance.service';
import { CoursePrerequisiteController } from './course-prerequisite/course-prerequisite.controller';
import { CoursePrerequisiteModule } from './course-prerequisite/course-prerequisite.module';
import { CoursePrerequisiteService } from './course-prerequisite/course-prerequisite.service';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { ProgramController } from './program/program.controller';
import { ProgramModule } from './program/program.module';
import { ProgramService } from './program/program.service';
import { SessionController } from './session/session.controller';
import { SessionModule } from './session/session.module';
import { SessionService } from './session/session.service';

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

    CourseModule,
    CourseInstanceModule,
    CoursePrerequisiteModule,
    SessionModule,
    ProgramModule,
  ],
  providers: [
    PrismaService,
    FileUtil,
    HoraireCoursService,
    PlanificationCoursService,

    CourseService,
    CourseInstanceService,
    CoursePrerequisiteService,
    ProgramService,
    SessionService,
  ],
  controllers: [
    AppController,
    PdfController,
    EtsController,

    CourseController,
    CourseInstanceController,
    CoursePrerequisiteController,
    ProgramController,
    SessionController,
  ],
})
export class AppModule {}
