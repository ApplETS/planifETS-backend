import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Course } from '@prisma/client';
import { Job } from 'bullmq';

import { CheminotService } from '../../common/api-helper/cheminot/cheminot.service';
import { Course as CourseCheminot } from '../../common/api-helper/cheminot/Course';
import { Program as ProgramCheminot } from '../../common/api-helper/cheminot/Program';
import { EtsCourseService } from '../../common/api-helper/ets/course/ets-course.service';
import { CourseService } from '../../course/course.service';
import {
  ProgramIncludeCourseIdsAndPrerequisitesType,
  ProgramService,
} from '../../program/program.service';
import { ProgramCourseService } from '../../program-course/program-course.service';
import { QueuesEnum } from '../queues.enum';

@Processor(QueuesEnum.COURSES)
export class CoursesProcessor extends WorkerHost {
  private readonly logger = new Logger(CoursesProcessor.name);

  constructor(
    private readonly etsCourseService: EtsCourseService,
    private readonly courseService: CourseService,
    private readonly programCourseService: ProgramCourseService,
    private readonly programService: ProgramService,
    private readonly cheminotService: CheminotService,
  ) {
    super();
  }

  public async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'upsert-courses':
        await this.processCourses(job);
        break;
      case 'courses-details-prerequisites':
        await this.syncCourseDetailsWithCheminotData(job);
        break;
      default:
        this.logger.error('Unknown job name: ' + job.name);
    }
  }

  private async processCourses(job: Job): Promise<void> {
    this.logger.log('Processing courses...');

    try {
      const courses = await this.etsCourseService.fetchAllCoursesWithCredits();

      const coursesLength = courses.length;

      if (!coursesLength) {
        this.logger.error('No courses fetched.');
        throw new Error('No courses fetched.');
      }

      this.logger.log(`${coursesLength} courses fetched.`);

      await this.courseService.upsertCourses(courses);

      job.updateProgress(100);

      job.updateData({
        processed: true,
        courses: courses.length,
      });
    } catch (error: unknown) {
      this.logger.error('Error processing courses: ', error);
      throw error;
    }
  }

  private async syncCourseDetailsWithCheminotData(job: Job): Promise<void> {
    this.logger.log('Syncing course details with Cheminot data...');

    try {
      const allProgramsDB =
        await this.programService.getAllProgramsWithCourses();
      const programsCheminot =
        await this.cheminotService.parseProgramsAndCoursesCheminot();

      console.debug(`Total programs from DB: ${allProgramsDB.length}`);
      console.debug(`Total programs from Cheminot: ${programsCheminot.length}`);

      for (const programDB of allProgramsDB) {
        if (!programDB) {
          this.logger.warn('ProgramDB not found for program: ', programDB);
          continue;
        }

        await this.processProgram(programDB, programsCheminot);
      }

      job.updateProgress(100);
      job.updateData({ processed: true, programs: allProgramsDB.length });
    } catch (error: unknown) {
      this.logger.error(
        'Error syncing course details with Cheminot data: ',
        error,
      );
      throw error;
    }
  }

  private async processProgram(
    programDB: ProgramIncludeCourseIdsAndPrerequisitesType,
    programsCheminot: ProgramCheminot[],
  ): Promise<void> {
    console.debug(`Processing program: ${programDB.code}`);
    const programCheminot = programsCheminot.find(
      (p) => p.code === programDB.code,
    );

    if (!programCheminot) {
      this.logger.warn(`Program ${programDB.code} not found in Cheminot data`);
      return;
    }

    this.logger.log(
      `Program in the db: ${programDB.code}\tCourses in DB: ${programDB.courses.length}`,
    );
    this.logger.log(`Courses in Cheminot: ${programCheminot.courses.length}`);

    await this.processCheminotCourses(programDB, programCheminot);
  }

  private async processCheminotCourses(
    programDB: ProgramIncludeCourseIdsAndPrerequisitesType,
    programCheminot: ProgramCheminot,
  ): Promise<void> {
    for (const courseCheminot of programCheminot.courses) {
      const existingCourse = await this.courseService.getCourse({
        code: courseCheminot.code,
      });

      if (!existingCourse) {
        continue;
      }

      await this.handleProgramCourseUpsertion(
        programDB,
        existingCourse,
        courseCheminot,
      );
    }
  }

  private async handleProgramCourseUpsertion(
    programDB: ProgramIncludeCourseIdsAndPrerequisitesType,
    existingCourse: Course,
    courseCheminot: CourseCheminot,
  ): Promise<void> {
    const programCourse = programDB.courses.find(
      (pc) => pc.course.code === courseCheminot.code,
    );

    if (programCourse) {
      const hasChanges = this.programCourseService.hasProgramCourseChanged(
        {
          typicalSessionIndex: courseCheminot.session,
          type: courseCheminot.type,
        },
        {
          typicalSessionIndex: programCourse.typicalSessionIndex,
          type: programCourse.type,
        },
        programDB.id,
        existingCourse.id,
      );

      if (hasChanges) {
        this.logger.verbose(
          `Updating ProgramCourse for courseId ${existingCourse.id} and programId ${programDB.id}`,
        );
        await this.programCourseService.updateProgramCourse({
          where: {
            courseId_programId: {
              courseId: existingCourse.id,
              programId: programDB.id,
            },
          },
          data: {
            typicalSessionIndex: courseCheminot.session,
            type: courseCheminot.type,
          },
        });
      }
    } else {
      await this.programCourseService.createProgramCourse({
        program: { connect: { id: programDB.id } },
        course: { connect: { id: existingCourse.id } },
        typicalSessionIndex: courseCheminot.session,
        type: courseCheminot.type,
      });
    }
  }
}
