import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';

import { ERROR_MESSAGES } from '../constants/error-messages';
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
    if (!pdfUrl || !isValidUrl(pdfUrl)) {
      throw new HttpException(
        ERROR_MESSAGES.REQUIRED_PDF_URL,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.horaireCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new HttpException(
        ERROR_MESSAGES.ERROR_PARSING_PDF,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('planification-cours')
  public async parsePlanificationCoursPdf(
    @Query('pdfUrl') pdfUrl: string,
  ): Promise<PlanificationCours[]> {
    if (!pdfUrl || !isValidUrl(pdfUrl)) {
      throw new HttpException(
        ERROR_MESSAGES.REQUIRED_PDF_URL,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.planificationCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new HttpException(
        ERROR_MESSAGES.ERROR_PARSING_PDF,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
