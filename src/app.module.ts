import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EtsController } from './common/api-helper/ets/ets.controller';
import { EtsModule } from './common/api-helper/ets/ets.module';
import { FileUtil } from './common/utils/pdf/fileUtil';
import config from './config/configuration';
import { CourseModule } from './course/course.module';
import { CourseInstanceModule } from './course-instance/course-instance.module';
import { CoursePrerequisiteController } from './course-prerequisite/course-prerequisite.controller';
import { CoursePrerequisiteModule } from './course-prerequisite/course-prerequisite.module';
import { PdfController } from './pdf/pdf.controller';
import { HoraireCoursService } from './pdf/pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from './pdf/pdf-parser/planification/planification-cours.service';
import { ProgramModule } from './program/program.module';
import { ScraperModule } from './scraper/scraper.module';
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
  ],
  providers: [HoraireCoursService, PlanificationCoursService, FileUtil],
  controllers: [PdfController, EtsController, CoursePrerequisiteController],
})
export class AppModule {}
