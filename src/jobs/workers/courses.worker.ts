import { Injectable, Logger } from '@nestjs/common';
import { Course } from '@prisma/client';

import { CheminotService } from '@/common/api-helper/cheminot/cheminot.service';
import { Course as CourseCheminot } from '@/common/api-helper/cheminot/Course';
import { Program as ProgramCheminot } from '@/common/api-helper/cheminot/Program';
import { EtsCourseService } from '@/common/api-helper/ets/course/ets-course.service';

import { CourseService } from '../../course/course.service';
import { ProgramService } from '../../program/program.service';
import { ProgramIncludeCourseIdsAndPrerequisitesDto } from '../../program/program.types';
import { ProgramCourseService } from '../../program-course/program-course.service';

@Injectable()
export class CoursesJobService {
  private static readonly DESCRIPTION_SYNC_BATCH_SIZE = 10;
  private static readonly COURSE_DESCRIPTION_SYNC_BATCH_DELAY_MS = 100;

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

    const courses = await this.courseService.getCoursesForDescriptionSync();
    let updatedCount = 0;
    let skippedCount = 0;
    const failedCourseCodes: string[] = [];

    const coursesWithCodes: typeof courses = [];

    for (const course of courses) {
      if (!course.code?.trim()) {
        skippedCount += 1;
        this.logger.warn(
          `Skipping course description sync for course ${course.id}: missing course code.`,
        );
        continue;
      }
      coursesWithCodes.push(course);
    }

    for (
      let index = 0;
      index < coursesWithCodes.length;
      index += CoursesJobService.DESCRIPTION_SYNC_BATCH_SIZE
    ) {
      const batch = coursesWithCodes.slice(
        index,
        index + CoursesJobService.DESCRIPTION_SYNC_BATCH_SIZE,
      );
      const results = await Promise.allSettled(
        batch.map((course) =>
          this.etsCourseService.fetchCourseDescriptionFromEtsWebsite(
            course.code,
          ),
        ),
      );
      const coursesToUpdate: Array<Pick<Course, 'id' | 'code' | 'description'>> =
        [];
      const failedCoursesByError = new Map<string, string[]>();

      results.forEach((result, resultIndex) => {
        const course = batch[resultIndex];

        if (result.status === 'fulfilled') {
          if (result.value !== course.description) {
            coursesToUpdate.push({
              id: course.id,
              code: course.code,
              description: result.value,
            });
          }
          return;
        }

        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        const courseCodes = failedCoursesByError.get(errorMessage) ?? [];

        courseCodes.push(course.code);
        failedCoursesByError.set(errorMessage, courseCodes);
      });

      if (coursesToUpdate.length > 0) {
        await this.courseService.updateCourseDescriptionsBatch(coursesToUpdate);
        updatedCount += coursesToUpdate.length;
      }

      failedCoursesByError.forEach((courseCodes) => {
        failedCourseCodes.push(...courseCodes);
      });

      if (index + CoursesJobService.DESCRIPTION_SYNC_BATCH_SIZE < coursesWithCodes.length) {
        await this.delay(CoursesJobService.COURSE_DESCRIPTION_SYNC_BATCH_DELAY_MS);
      }
    }

    this.logger.log(
      `Course description sync completed. Processed ${courses.length} courses, updated ${updatedCount}, skipped ${skippedCount}, failed ${failedCourseCodes.length}.`,
    );

    if (failedCourseCodes.length > 0) {
      this.logger.warn(
        `Failed to sync descriptions for courses because they could not be found on the ETS website or their description could not be extracted: [${failedCourseCodes.join(', ')}]`,
      );
    }
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
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
        `${Object.keys(missingCoursesInDatabase).length} missing courses in database:      
        ${JSON.stringify(missingCoursesInDatabase, null, 2)}`,
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
