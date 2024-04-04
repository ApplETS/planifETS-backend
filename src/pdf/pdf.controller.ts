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

  @Get('horaire-cours')
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
      throw new InternalServerErrorException(
        'Error parsing Horaire Cours PDF' + error,
      );
    }
  }

  @Get('planification-cours')
  public async parsePlanificationCoursPdf(
    @Query('pdfUrl') pdfUrl: string,
  ): Promise<PlanificationCours[]> {
    try {
      console.log('Controller file', pdfUrl);
      if (!pdfUrl) {
        console.log('PDF URL is required', HttpStatus.BAD_REQUEST, pdfUrl);
        throw new BadRequestException('pdfUrl attribute is required');
      } else if (!isValidUrl(pdfUrl)) {
        throw new BadRequestException('pdfUrl is not valid');
      }

      return await this.planificationCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error parsing Planification Cours PDF',
      );
    }
  }
}
