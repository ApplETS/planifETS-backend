import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ERROR_MESSAGES } from '../../constants/error-messages';
import { getHorairePdfUrl, getPlanificationPdfUrl } from '../../constants/url';
import { HoraireCoursService } from './pdf-parser/horaire/horaire-cours.service';
import { IHoraireCours } from './pdf-parser/horaire/horaire-cours.types';
import { PlanificationCoursService } from './pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from './pdf-parser/planification/planification-cours.types';

@ApiTags('ÉTS API')
@Controller('pdf')
export class PdfController {
  constructor(
    private horaireCoursService: HoraireCoursService,
    private planificationCoursService: PlanificationCoursService,
  ) {}

  @Get('horaire-cours')
  public async parseHoraireCoursPdf(
    @Query('session') sessionCode: string,
    @Query('program') programCode: string,
  ): Promise<IHoraireCours[]> {
    if (!sessionCode || !programCode) {
      throw new HttpException(
        ERROR_MESSAGES.REQUIRED_SESSION_AND_PROGRAM_CODE,
        HttpStatus.BAD_REQUEST,
      );
    }

    const pdfUrl = getHorairePdfUrl(sessionCode, programCode);

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
    @Query('program') programCode: string,
  ): Promise<ICoursePlanification[]> {
    if (!programCode) {
      throw new HttpException(
        ERROR_MESSAGES.REQUIRED_PDF_URL,
        HttpStatus.BAD_REQUEST,
      );
    }

    const pdfUrl = getPlanificationPdfUrl(programCode);

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
