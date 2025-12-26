import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { ERROR_MESSAGES } from '@/common/utils/error/error-constants';
import { isAxiosError } from '@/common/utils/error/errorUtil';
import { getHorairePdfUrl, getPlanificationPdfUrl } from '@/common/utils/url/url-constants';

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
  @ApiQuery({ name: 'program', description: 'Program code, e.g. 7084' })
  @ApiQuery({ name: 'session', description: 'Session code, e.g. 20261' })
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
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new HttpException(
          ERROR_MESSAGES.HORAIRE_PDF_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        ERROR_MESSAGES.ERROR_PARSING_HORAIRE_PDF,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('planification-cours')
  @ApiQuery({ name: 'program', description: 'Program code, e.g. 7084' })
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
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new HttpException(
          ERROR_MESSAGES.PLANIFICATION_PDF_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        ERROR_MESSAGES.ERROR_PARSING_PLANIFICATION_PDF,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
