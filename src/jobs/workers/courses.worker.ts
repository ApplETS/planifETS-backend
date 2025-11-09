import { Injectable, Logger } from '@nestjs/common';
import { Course } from '@prisma/client';

import { CheminotService } from '../../common/api-helper/cheminot/cheminot.service';
import { Course as CourseCheminot } from '../../common/api-helper/cheminot/Course';
import { Program as ProgramCheminot } from '../../common/api-helper/cheminot/Program';
import { EtsCourseService } from '../../common/api-helper/ets/course/ets-course.service';
import { CourseService } from '../../course/course.service';
import { ProgramService } from '../../program/program.service';
import { ProgramIncludeCourseIdsAndPrerequisitesDto } from '../../program/program.types';
import { ProgramCourseService } from '../../program-course/program-course.service';

@Injectable()
export class CoursesJobService {
  private readonly logger = new Logger(CoursesJobService.name);

  constructor(
    private readonly etsCourseService: EtsCourseService,
    private readonly courseService: CourseService,
    private readonly programCourseService: ProgramCourseService,
    private readonly programService: ProgramService,
    private readonly cheminotService: CheminotService,
  ) {}

  public async processCourses(): Promise<void> {
    this.logger.log('Processing courses...');
    const courses = await this.etsCourseService.fetchAllCoursesWithCredits();
    if (!courses.length) {
      this.logger.error('No courses fetched.');
      throw new Error('No courses fetched.');
    }
    await this.courseService.upsertCourses(courses);
  }

  public async syncCourseDetailsWithCheminotData(): Promise<void> {
    this.logger.log('Syncing course details with Cheminot data...');

    const existingAllPrograms =
      await this.programService.getAllProgramsWithCourses();
    const cheminotPrograms =
      await this.cheminotService.parseProgramsAndCoursesCheminot();

    const missingProgramsInCheminot: string[] = [];
    const missingCoursesInDatabase: { [programCode: string]: string[] } = {};

    for (const existingProgram of existingAllPrograms) {
      if (!existingProgram) {
        this.logger.warn('ExistingProgram not found:', existingProgram);
        continue;
      }
      await this.processProgram(
        existingProgram,
        cheminotPrograms,
        missingProgramsInCheminot,
        missingCoursesInDatabase,
      );
    }

    // Log missing courses and programs
    if (Object.keys(missingCoursesInDatabase).length > 0) {
      this.logger.warn(
        `Missing courses in database: ${JSON.stringify(missingCoursesInDatabase, null, 2)}`,
      );
    }

    if (missingProgramsInCheminot.length > 0) {
      this.logger.warn(
        `Programs not found in Cheminot data: ${JSON.stringify(missingProgramsInCheminot, null, 2)}`,
      );
    }
  }

  private async processProgram(
    existingProgram: ProgramIncludeCourseIdsAndPrerequisitesDto,
    cheminotPrograms: ProgramCheminot[],
    missingProgramsInCheminot: string[],
    missingCoursesInDatabase: { [programCode: string]: string[] },
  ): Promise<void> {
    const programCheminot = cheminotPrograms.find(
      (p) => p.code === existingProgram.code,
    );
    if (!programCheminot) {
      const programCode = existingProgram.code ?? `ID_${existingProgram.id}`;
      missingProgramsInCheminot.push(programCode);
      return;
    }
    await this.processCheminotCourses(
      existingProgram,
      programCheminot,
      missingCoursesInDatabase,
    );
  }

  private async processCheminotCourses(
    existingProgram: ProgramIncludeCourseIdsAndPrerequisitesDto,
    cheminotProgram: ProgramCheminot,
    missingCoursesInDatabase: { [programCode: string]: string[] },
  ): Promise<void> {
    const missingCourses: string[] = [];

    for (const courseCheminot of cheminotProgram.courses) {
      const existingCourse = await this.courseService.getCourse({
        code: courseCheminot.code,
      });
      if (!existingCourse) {
        missingCourses.push(courseCheminot.code);
        continue;
      }
      await this.handleProgramCourseUpsertion(
        existingProgram,
        existingCourse,
        courseCheminot,
      );
    }

    if (missingCourses.length > 0) {
      const programCode = existingProgram.code ?? `ID_${existingProgram.id}`;
      missingCoursesInDatabase[`Program ${programCode}`] = missingCourses;
    }
  }

  private async handleProgramCourseUpsertion(
    existingProgram: ProgramIncludeCourseIdsAndPrerequisitesDto,
    existingCourse: Course,
    cheminotCourse: CourseCheminot,
  ): Promise<void> {
    const existingProgramCourse = existingProgram.courses.find(
      (pc) => pc.course.code === cheminotCourse.code,
    );
    if (existingProgramCourse) {
      const hasChanges = this.programCourseService.hasProgramCourseChanged(
        {
          typicalSessionIndex: cheminotCourse.session,
          type: cheminotCourse.type,
        },
        {
          typicalSessionIndex: existingProgramCourse.typicalSessionIndex,
          type: existingProgramCourse.type,
        },
        existingProgram.id,
        existingCourse.id,
      );
      if (hasChanges) {
        await this.programCourseService.updateProgramCourse({
          where: {
            courseId_programId: {
              courseId: existingCourse.id,
              programId: existingProgram.id,
            },
          },
          data: {
            typicalSessionIndex: cheminotCourse.session,
            type: cheminotCourse.type,
          },
        });
      }
    } else {
      await this.programCourseService.createProgramCourse({
        program: { connect: { id: existingProgram.id } },
        course: { connect: { id: existingCourse.id } },
        typicalSessionIndex: cheminotCourse.session,
        type: cheminotCourse.type,
      });
    }
  }
}
