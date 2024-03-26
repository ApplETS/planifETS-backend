import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Query,
} from '@nestjs/common';

import { isValidUrl } from '../utils/url/urlUtils';
import { HoraireCoursService } from './pdf-parser/horaire/horaire-cours.service';
import { IHoraireCours } from './pdf-parser/horaire/horaire-cours.types';
import { PlanificationCoursService } from './pdf-parser/planification/planification-cours.service';
import { PlanificationCours } from './pdf-parser/planification/planification-cours.types';

@Controller('pdf')
export class PdfController {
  constructor(
    private horaireCoursService: HoraireCoursService,
    private planificationCoursService: PlanificationCoursService,
  ) {}

  @Get('parseHoraireCoursPdf')
  public async parseHoraireCoursPdf(
    @Query('pdfUrl') pdfUrl: string,
  ): Promise<IHoraireCours[]> {
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
  public async parsePlanificationCoursPdf(
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
