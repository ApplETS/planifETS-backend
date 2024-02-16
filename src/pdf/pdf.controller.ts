import {
  Controller,
  HttpStatus,
  Get,
  Query,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { HoraireCoursService } from './pdf-parser/horaire-cours.service';
import { PlanificationCoursService } from './pdf-parser/planification-cours.service';
import { isValidUrl } from '../utils/url/urlUtils';

@Controller('pdf')
export class PdfController {
  constructor(
    private horaireCoursService: HoraireCoursService,
    private planificationCoursService: PlanificationCoursService,
  ) {}

  @Get('parseHoraireCoursPdf')
  async parseHoraireCoursPdf(@Query('pdfUrl') pdfUrl: string): Promise<any> {
    if (!pdfUrl || !isValidUrl(pdfUrl)) {
      throw new BadRequestException('PDF URL is required');
    }
    try {
      return await this.horaireCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new InternalServerErrorException('Error parsing Horaire Cours PDF');
    }
  }

  @Get('parsePlanificationCoursPdf')
  async parsePlanificationCoursPdf(
    @Query('pdfUrl') pdfUrl: string,
  ): Promise<any> {
    console.log('Controller file', pdfUrl);
    if (!pdfUrl || !isValidUrl(pdfUrl)) {
      console.log('PDF URL is required', HttpStatus.BAD_REQUEST, pdfUrl);
      throw new BadRequestException('pdfUrl attribute is required');
    }
    try {
      return await this.planificationCoursService.parsePdfFromUrl(pdfUrl);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error parsing Planification Cours PDF',
      );
    }
  }
}
