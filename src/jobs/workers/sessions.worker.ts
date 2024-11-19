// src/jobs/workers/sessions.worker.ts

import { Injectable, Logger } from '@nestjs/common';
import { Program, Session } from '@prisma/client';

import {
  getHorairePdfUrl,
  getPlanificationPdfUrl,
} from '../../common/constants/url';
import { getTrimesterIndexBySession } from '../../common/utils/session/sessionUtil';
import { HoraireCoursService } from '../../common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { ProgramService } from '../../program/program.service';
import { SessionService } from '../../session/session.service';

@Injectable()
export class SessionsJobService {
  private readonly logger = new Logger(SessionsJobService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly programService: ProgramService,
    private readonly horaireCoursService: HoraireCoursService,
  ) {}

  /**
   * Main method to process sessions and parse Horaire PDFs.
   */
  public async processSessions(): Promise<void> {
    this.logger.log('Starting processSessions job.');

    try {
      const currentSession =
        await this.sessionService.getOrCreateCurrentSession();
      this.logger.log(
        `Current session: Year ${currentSession.year}, Trimester ${currentSession.trimester}`,
      );

      const eligiblePrograms =
        await this.programService.getProgramsByHoraireParsablePDF();
      this.logger.log(
        `Found ${eligiblePrograms.length} programs with horaireParsablePdf = true.`,
      );

      for (const program of eligiblePrograms) {
        await this.processProgram(currentSession, program);
      }

      this.logger.log('processSessions job completed successfully.');
    } catch (error) {
      this.logger.error('Error in processSessions job:', error);
    }
  }

  private async processProgram(
    session: Session,
    program: Program,
  ): Promise<void> {
    const { code: programCode } = program;
    this.logger.log(`Processing program: ${programCode}`);

    if (!programCode) {
      throw new Error(
        `Program code is null for program: ${JSON.stringify(program)}`,
      );
    }

    try {
      // a. Generate Horaire PDF URL
      const horairePdfUrl = getHorairePdfUrl(
        `${session.year}${getTrimesterIndexBySession(session.trimester)}`,
        programCode,
      );

      // b. Fetch and parse Horaire PDF
      const parsedCourses =
        await this.horaireCoursService.parsePdfFromUrl(horairePdfUrl);
      this.logger.log(
        `Parsed ${parsedCourses.length} courses for program ${programCode}.`,
      );

      // c. Handle parsed data
      await this.handleParsedCourses(programCode, parsedCourses);
      this.logger.log(`Saved parsed courses for program ${programCode}.`);
    } catch (error) {
      this.logger.error(`Error processing program ${programCode}:`, error);
    }
  }

  private async handleParsedCourses(
    programCode: string,
    courses: any[],
  ): Promise<void> {
    //TODO: implement, create programs utils to handle prerequisites.
  }
}
