import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { EtsController } from './common/api-helper/ets/ets.controller';
import { EtsModule } from './common/api-helper/ets/ets.module';
import { ScraperModule } from './common/api-helper/ets/scraper/scraper.module';
import { FileUtil } from './common/utils/pdf/fileUtil';
import { PdfController } from './common/website-helper/pdf/pdf.controller';
import { HoraireCoursService } from './common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from './common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import config from './config/configuration';
import { CourseModule } from './course/course.module';
import { CourseInstanceModule } from './course-instance/course-instance.module';
import { CoursePrerequisiteController } from './course-prerequisite/course-prerequisite.controller';
import { CoursePrerequisiteModule } from './course-prerequisite/course-prerequisite.module';
import { CoursePrerequisiteService } from './course-prerequisite/course-prerequisite.service';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
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
    ProgramModule,
    CourseModule,
    CourseInstanceModule,
    SessionModule,
    CoursePrerequisiteModule,
    ScraperModule,
    EtsModule,
    PrismaModule,
  ],
  providers: [
    HoraireCoursService,
    PlanificationCoursService,
    FileUtil,
    CoursePrerequisiteService,
    PrismaService,
  ],
  controllers: [
    AppController,
    PdfController,
    EtsController,
    CoursePrerequisiteController,
  ],
})
export class AppModule {}
