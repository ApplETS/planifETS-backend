import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import config from './config/configuration';
import { PdfController } from './pdf/pdf.controller';
import { HoraireCoursService } from './pdf/pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from './pdf/pdf-parser/planification/planification-cours.service';
import { FileUtil } from './utils/pdf/fileUtil';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: '.env',
    }),
    HttpModule,
  ],
  providers: [HoraireCoursService, PlanificationCoursService, FileUtil],
  controllers: [PdfController],
})
export class AppModule {}
