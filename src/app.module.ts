import { Module } from '@nestjs/common';
import { HoraireCoursService } from './pdf/pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from './pdf/pdf-parser/planification/planification-cours.service';
import { PdfController } from './pdf/pdf.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [HoraireCoursService, PlanificationCoursService],
  controllers: [PdfController],
})
export class AppModule {}
