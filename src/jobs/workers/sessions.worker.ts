import { Injectable, Logger } from '@nestjs/common';
import { Course, Program, ProgramCourse, Session } from '@prisma/client';

import { getHorairePdfUrl } from '../../common/constants/url';
import { CourseCodeValidationPipe } from '../../common/pipes/models/course/course-code-validation-pipe';
import { getTrimesterIndexBySession } from '../../common/utils/session/sessionUtil';
import { HoraireCoursService } from '../../common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { IHoraireCours } from '../../common/website-helper/pdf/pdf-parser/horaire/horaire-cours.types';
import { CourseService } from '../../course/course.service';
import { PrerequisiteService } from '../../prerequisite/prerequisite.service';
import { ProgramService } from '../../program/program.service';
import { ProgramCourseService } from '../../program-course/program-course.service';
import { ProgramCourseWithPrerequisites } from '../../program-course/program-course.types';
import { SessionService } from '../../session/session.service';

@Injectable()
export class SessionsJobService {
  private readonly logger = new Logger(SessionsJobService.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly programService: ProgramService,
    private readonly horaireCoursService: HoraireCoursService,
    private readonly courseService: CourseService,
    private readonly programCourseService: ProgramCourseService,
    private readonly prerequisiteService: PrerequisiteService,
    private readonly courseCodeValidationPipe: CourseCodeValidationPipe,
  ) {}

  /**
   * Main method to process prerequisites in the
   * current session using Horaire-cours PDF.
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
    const existingCourse = await this.getExisitingCourse(coursePdf.code);
    if (!existingCourse) {
      this.logger.error(`Course not found in database: ${coursePdf.code}`);
      return;
    }

    const programCourse =
      await this.programCourseService.getProgramCourseWithPrerequisites({
        courseId_programId: {
          courseId: existingCourse.id,
          programId: program.id,
        },
      });

    if (!programCourse) {
      //this.logger.error(
      //  `ProgramCourse not found for course ${coursePdf.code} and program ${program.code}`,
      //);
      return;
    }

    if (!coursePdf.prerequisites || coursePdf.prerequisites.trim() === '') {
      return;
    }

    const parsedPrerequisites = this.parsePrerequisiteString(
      coursePdf.prerequisites,
    );

    if (!parsedPrerequisites) {
      this.logger.debug(
        `Unstructured prerequisites for course ${coursePdf.code}: "${coursePdf.prerequisites}"`,
      );
      await this.updateUnstructuredPrerequisite(
        programCourse,
        coursePdf.prerequisites,
      );
      return;
    }

    await this.updateUnstructuredPrerequisite(programCourse, null);

    for (const prerequisiteCode of parsedPrerequisites) {
      await this.addPrerequisiteIfNotExists(
        programCourse,
        prerequisiteCode,
        program,
      );
    }
  }

  private async getExisitingCourse(courseCode: string): Promise<Course | null> {
    return this.courseService.getCourseByCode(courseCode);
  }

  //add to utils
  private parsePrerequisiteString(prerequisiteString: string): string[] | null {
    const trimmedPrerequisite = prerequisiteString.trim();

    if (!trimmedPrerequisite) {
      console.log('Empty string for ', trimmedPrerequisite);
      return null;
    }

    // Attempt to validate the entire string as a single course code
    const singleValidation =
      this.courseCodeValidationPipe.transform(trimmedPrerequisite);
    if (singleValidation !== false) {
      console.log(
        'Single validation',
        singleValidation,
        'typeof',
        typeof singleValidation,
      );

      return typeof singleValidation === 'string' ? [singleValidation] : null;
    }

    // If single validation fails, attempt to split and validate multiple course codes
    const courseCodes = trimmedPrerequisite.split(',').map((s) => s.trim());

    const validCourseCodes: string[] = [];
    for (const code of courseCodes) {
      const validatedCode = this.courseCodeValidationPipe.transform(code);
      console.log('Code', code, '   =', validatedCode);
      if (validatedCode === false) {
        // If any code is invalid, treat the entire prerequisite string as unstructured
        return null;
      }
      if (typeof validatedCode === 'string') {
        validCourseCodes.push(validatedCode);
      }
    }

    return validCourseCodes;
  }

  private async updateUnstructuredPrerequisite(
    programCourse: ProgramCourse,
    newUnstructuredPrerequisite: string | null,
  ): Promise<void> {
    if (
      programCourse.unstructuredPrerequisite !== newUnstructuredPrerequisite
    ) {
      await this.programCourseService.updateProgramCourse({
        where: {
          courseId_programId: {
            courseId: programCourse.courseId,
            programId: programCourse.programId,
          },
        },
        data: {
          unstructuredPrerequisite: newUnstructuredPrerequisite,
        },
      });
    }
  }

  private async addPrerequisiteIfNotExists(
    programCourse: ProgramCourseWithPrerequisites,
    prerequisiteCode: string,
    program: Program,
  ): Promise<void> {
    const existingPrerequisiteCodes =
      programCourse.prerequisites?.map((p) => p.prerequisite.course.code) ?? [];

    if (existingPrerequisiteCodes.includes(prerequisiteCode)) {
      return;
    }

    const prerequisiteCourse = await this.getExisitingCourse(prerequisiteCode);
    if (!prerequisiteCourse) {
      this.logger.error(
        `Prerequisite course not found in database: ${prerequisiteCode}`,
      );
      return;
    }

    const prerequisiteProgramCourse =
      await this.programCourseService.getProgramCourseWithPrerequisites({
        courseId_programId: {
          courseId: prerequisiteCourse.id,
          programId: program.id,
        },
      });

    if (!prerequisiteProgramCourse) {
      this.logger.error(
        `ProgramCourse not found for prerequisite course ${prerequisiteCode} and program ${program.code}`,
      );
      return;
    }

    await this.prerequisiteService.createPrerequisite({
      programCourse: {
        connect: {
          courseId_programId: {
            courseId: programCourse.courseId,
            programId: programCourse.programId,
          },
        },
      },
      prerequisite: {
        connect: {
          courseId_programId: {
            courseId: prerequisiteProgramCourse.courseId,
            programId: prerequisiteProgramCourse.programId,
          },
        },
      },
    });
  }
}
