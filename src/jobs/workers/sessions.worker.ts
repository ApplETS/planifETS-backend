import { Injectable, Logger } from '@nestjs/common';
import { Course, Program, Session } from '@prisma/client';

import { CourseCodeValidationPipe } from '@/common/pipes/models/course/course-code-validation-pipe';
import { parsePrerequisiteString } from '@/common/utils/prerequisite/prerequisiteUtil';
import { getTrimesterIndexBySession } from '@/common/utils/session/sessionUtil';
import { getHorairePdfUrl } from '@/common/utils/url/url-constants';
import { HoraireCoursService } from '@/common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { IHoraireCours } from '@/common/website-helper/pdf/pdf-parser/horaire/horaire-cours.types';

import { CourseService } from '../../course/course.service';
import { PrerequisiteService } from '../../prerequisite/prerequisite.service';
import { seedProgramHorairePdfParserFlags } from '../../prisma/programs.seeder';
import { ProgramService } from '../../program/program.service';
import { ProgramCourseService } from '../../program-course/program-course.service';
import { ProgramCourseWithPrerequisites } from '../../program-course/types/program-course.types';
import { SessionService } from '../../session/session.service';

@Injectable()
export class SessionsJobService {
  private readonly logger = new Logger(SessionsJobService.name);

  private unstructuredPrerequisitesUpdated = 0;
  private prerequisitesAdded = 0;
  private prerequisitesDeleted = 0;

  constructor(
    private readonly sessionService: SessionService,
    private readonly programService: ProgramService,
    private readonly horaireCoursService: HoraireCoursService,
    private readonly courseService: CourseService,
    private readonly programCourseService: ProgramCourseService,
    private readonly prerequisiteService: PrerequisiteService,
    private readonly courseCodeValidationPipe: CourseCodeValidationPipe,
  ) { }

  /**
   * Main method to process prerequisites, using the current session data in Horaire-cours PDF.
   */
  public async processSessions(): Promise<void> {
    this.logger.log('Starting processSessions job.');

    try {
      // Seed programs with horaireParsablePdf = true
      await seedProgramHorairePdfParserFlags();

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

      // Log total counts
      this.logger.log(
        `Total unstructured prerequisites updated: ${this.unstructuredPrerequisitesUpdated}`,
      );
      this.logger.log(`Total prerequisites added: ${this.prerequisitesAdded}`);
      this.logger.log(
        `Total prerequisites deleted: ${this.prerequisitesDeleted}`,
      );
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
      await this.handleParsedCourses(program, parsedCourses);
      this.logger.log(`Saved parsed courses for program ${programCode}.`);
    } catch (error) {
      this.logger.error(`Error processing program ${programCode}:`, error);
    }
  }

  private async handleParsedCourses(
    program: Program,
    courses: IHoraireCours[],
  ): Promise<void> {
    for (const course of courses) {
      await this.processPrerequisites(course, program);
    }
  }

  private async processPrerequisites(
    coursePdf: IHoraireCours,
    program: Program,
  ): Promise<void> {
    const existingCourse = await this.getExistingCourse(coursePdf.code);
    if (!existingCourse) {
      return;
    }

    const programCourse = await this.getProgramCourseWithPrerequisites(
      existingCourse.id,
      program.id,
    );
    if (!programCourse) {
      return;
    }

    const parsedPrerequisites = this.parsePrerequisites(coursePdf);

    // a. Update unstructured prerequisite if changed
    await this.updateUnstructuredPrerequisiteIfChanged(
      programCourse,
      coursePdf.prerequisites,
    );

    // If no valid parsed prerequisites exist, delete all existing prerequisites and return.
    if (!parsedPrerequisites) {
      await this.deleteAllPrerequisites(program.id, existingCourse.id);
      return;
    }

    // b. Delete unmatched prerequisites
    await this.deleteUnmatchedPrerequisites(
      program,
      existingCourse,
      programCourse,
      parsedPrerequisites,
    );

    // c. Add new prerequisites if they don’t already exist
    await this.addNewPrerequisites(program, programCourse, parsedPrerequisites);
  }

  private async getExistingCourse(courseCode: string) {
    const existingCourse = await this.courseService.getCourseByCode(courseCode);
    if (!existingCourse) {
      this.logger.error(`Course not found in database: ${courseCode}`);
    }
    return existingCourse;
  }

  private async getProgramCourseWithPrerequisites(
    courseId: number,
    programId: number,
  ): Promise<ProgramCourseWithPrerequisites | null> {
    const programCourse =
      await this.programCourseService.getProgramCourseWithPrerequisites({
        courseId_programId: {
          courseId,
          programId,
        },
      });
    if (!programCourse) {
      this.logger.warn(
        `ProgramCourse not found for courseId: ${courseId}, programId: ${programId}`,
      );
    }
    return programCourse;
  }

  private parsePrerequisites(coursePdf: IHoraireCours): string[] | null {
    const parsedPrerequisites = parsePrerequisiteString(
      coursePdf.prerequisites,
      this.courseCodeValidationPipe,
    );

    this.logger.debug(
      `Unstructured prerequisites for course ${coursePdf.code}: "${coursePdf.prerequisites}"`,
    );

    return parsedPrerequisites;
  }

  private async updateUnstructuredPrerequisiteIfChanged(
    programCourse: ProgramCourseWithPrerequisites,
    newUnstructuredPrerequisite: string | null,
  ) {
    const updatedUnstructPrereqCount =
      await this.prerequisiteService.updateUnstructuredPrerequisite(
        programCourse,
        newUnstructuredPrerequisite,
      );
    this.unstructuredPrerequisitesUpdated += updatedUnstructPrereqCount;
  }

  private async deleteAllPrerequisites(programId: number, courseId: number) {
    const wasDeletedCount =
      await this.prerequisiteService.deletePrerequisitesForProgramCourse(
        programId,
        courseId,
      );

    if (wasDeletedCount) {
      this.prerequisitesDeleted += wasDeletedCount;
    }
  }

  private async deleteUnmatchedPrerequisites(
    program: Program,
    existingCourse: Course,
    programCourse: ProgramCourseWithPrerequisites,
    parsedPrerequisites: string[],
  ) {
    const existingPrerequisites =
      programCourse.prerequisites?.map((p) => p.prerequisite.course.code) ?? [];
    const prerequisitesToDelete = existingPrerequisites.filter(
      (code) => !parsedPrerequisites.includes(code),
    );

    for (const prerequisiteCode of prerequisitesToDelete) {
      const prerequisiteCourse =
        await this.courseService.getCourseByCode(prerequisiteCode);
      if (!prerequisiteCourse) {
        this.logger.error(`Prerequisite course not found: ${prerequisiteCode}`);
        continue;
      }

      const wasDeletedCount =
        await this.prerequisiteService.deletePrerequisiteForProgramCourse(
          program.id,
          existingCourse.id,
          prerequisiteCourse.id,
        );

      if (wasDeletedCount) {
        this.prerequisitesDeleted += wasDeletedCount;
      }
    }
  }

  private async addNewPrerequisites(
    program: Program,
    programCourse: ProgramCourseWithPrerequisites,
    parsedPrerequisites: string[],
  ) {
    for (const prerequisiteCode of parsedPrerequisites) {
      const wasAdded =
        await this.prerequisiteService.addPrerequisiteIfNotExists(
          programCourse,
          prerequisiteCode,
          program,
        );
      if (wasAdded) {
        this.prerequisitesAdded += 1;
      }
    }
  }
}
