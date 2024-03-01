import {
  Controller,
  HttpStatus,
  Get,
  Query,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { HoraireCoursService } from './pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from './pdf-parser/planification/planification-cours.service';
import { isValidUrl } from '../utils/url/urlUtils';
import { PlanificationCours } from './pdf-parser/planification/planification-cours.types';
import { HoraireCours } from './pdf-parser/horaire/horaire-cours.types';

@Controller('pdf')
export class PdfController {
  constructor(
    private horaireCoursService: HoraireCoursService,
    private planificationCoursService: PlanificationCoursService,
  ) {}

  @Get('parseHoraireCoursPdf')
  async parseHoraireCoursPdf(
    @Query('pdfUrl') pdfUrl: string,
  ): Promise<HoraireCours[]> {
    try {
      console.log('Controller file', pdfUrl);
      if (!pdfUrl || !isValidUrl(pdfUrl)) {
        throw new BadRequestException('PDF URL is required');
      }
      return await this.horaireCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new InternalServerErrorException('Error parsing Horaire Cours PDF');
    }
  }

  @Get('parsePlanificationCoursPdf')
  async parsePlanificationCoursPdf(
    @Query('pdfUrl') pdfUrl: string,
  ): Promise<PlanificationCours[]> {
    try {
      console.log('Controller file', pdfUrl);
      if (!pdfUrl || !isValidUrl(pdfUrl)) {
        console.log('PDF URL is required', HttpStatus.BAD_REQUEST, pdfUrl);
        throw new BadRequestException('pdfUrl attribute is required');
      }
      return await this.planificationCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error parsing Planification Cours PDF',
      );
    }
  }
}
