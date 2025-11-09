import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { PdfController } from './pdf.controller';
import { HoraireCoursService } from './pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from './pdf-parser/planification/planification-cours.service';

@Module({
  imports: [HttpModule],
  providers: [HoraireCoursService, PlanificationCoursService],
  controllers: [PdfController],
  exports: [HoraireCoursService, PlanificationCoursService],
})
export class PdfModule {}
