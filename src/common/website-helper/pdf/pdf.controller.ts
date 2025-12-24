import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ERROR_MESSAGES } from '@/common/constants/error-messages';
import { getHorairePdfUrl, getPlanificationPdfUrl } from '@/common/constants/url';

import { HoraireCoursService } from './pdf-parser/horaire/horaire-cours.service';
import { IHoraireCours } from './pdf-parser/horaire/horaire-cours.types';
import { PlanificationCoursService } from './pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from './pdf-parser/planification/planification-cours.types';

@ApiTags('ÉTS API')
@Controller('pdf')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly horaireCoursService: HoraireCoursService,
    private readonly planificationCoursService: PlanificationCoursService,
  ) { }

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
      this.logger.error(
        `${ERROR_MESSAGES.ERROR_PARSING_HORAIRE_PDF} from URL ${pdfUrl}: `,
        error,
      );
      throw new HttpException(
        ERROR_MESSAGES.ERROR_PARSING_HORAIRE_PDF,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('planification-cours')
  public async parsePlanificationCoursPdf(
    @Query('program') programCode: string,
  ): Promise<ICoursePlanification[]> {
    if (!programCode) {
      this.logger.error(ERROR_MESSAGES.REQUIRED_PDF_URL);

      throw new HttpException(
        ERROR_MESSAGES.REQUIRED_PDF_URL,
        HttpStatus.BAD_REQUEST,
      );
    }

    const pdfUrl = getPlanificationPdfUrl(programCode);

    try {
      return await this.planificationCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      this.logger.error(
        `${ERROR_MESSAGES.ERROR_PARSING_PLANIFICATION_PDF} from URL ${pdfUrl}: `,
        error,
      );
      throw new HttpException(
        ERROR_MESSAGES.ERROR_PARSING_PLANIFICATION_PDF,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
