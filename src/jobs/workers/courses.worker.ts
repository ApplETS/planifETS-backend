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

  public async syncCourseDescriptionsFromEtsWebsite(): Promise<void> {
    this.logger.log('Syncing course descriptions from ETS website...');

    const courses = await this.courseService.getAllCourses();
    let updatedCount = 0;
    let skippedCount = 0;
    const failedCourseCodes: string[] = [];

    for (const course of courses) {
      if (!course.code?.trim()) {
        skippedCount += 1;
        this.logger.warn(
          `Skipping course description sync for course ${course.id}: missing course code.`,
        );
        continue;
      }

      try {
        const description =
          await this.etsCourseService.fetchCourseDescriptionFromEtsWebsite(
            course.code,
          );

        if (description !== course.description) {
          await this.courseService.updateCourse({
            where: { id: course.id },
            data: {
              code: course.code,
              description,
            },
          });
          updatedCount += 1;
        }
      } catch (error) {
        failedCourseCodes.push(course.code);
        this.logger.warn(
          `Failed to sync description for course ${course.code}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `Course description sync completed. Processed ${courses.length} courses, updated ${updatedCount}, skipped ${skippedCount}, failed ${failedCourseCodes.length}.`,
    );

    if (failedCourseCodes.length > 0) {
      this.logger.warn(
        `Course description sync failures: ${JSON.stringify(failedCourseCodes)}`,
      );
    }
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
