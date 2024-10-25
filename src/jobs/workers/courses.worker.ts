import { Injectable, Logger } from '@nestjs/common';
import { Course } from '@prisma/client';
import { CheminotService } from '../../common/api-helper/cheminot/cheminot.service';
import { Course as CourseCheminot } from '../../common/api-helper/cheminot/Course';
import { Program as ProgramCheminot } from '../../common/api-helper/cheminot/Program';
import { EtsCourseService } from '../../common/api-helper/ets/course/ets-course.service';
import { CourseService } from '../../course/course.service';
import { ProgramIncludeCourseIdsAndPrerequisitesType, ProgramService } from '../../program/program.service';
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
  ) { }

  public async processCourses(): Promise<void> {
    this.logger.log('Processing courses...');
    const courses = await this.etsCourseService.fetchAllCoursesWithCredits();
    if (!courses.length) {
      throw new Error('No courses fetched.');
    }
    await this.courseService.upsertCourses(courses);
  }

  public async syncCourseDetailsWithCheminotData(): Promise<void> {
    this.logger.log('Syncing course details with Cheminot data...');
    const allProgramsDB = await this.programService.getAllProgramsWithCourses();
    const programsCheminot = await this.cheminotService.parseProgramsAndCoursesCheminot();

    for (const programDB of allProgramsDB) {
      if (!programDB) {
        this.logger.warn('ProgramDB not found for program:', programDB);
        continue;
      }
      await this.processProgram(programDB, programsCheminot);
    }
  }

  private async processProgram(
    programDB: ProgramIncludeCourseIdsAndPrerequisitesType,
    programsCheminot: ProgramCheminot[],
  ): Promise<void> {
    const programCheminot = programsCheminot.find((p) => p.code === programDB.code);
    if (!programCheminot) {
      this.logger.warn(`Program ${programDB.code} not found in Cheminot data`);
      return;
    }
    await this.processCheminotCourses(programDB, programCheminot);
  }

  private async processCheminotCourses(
    programDB: ProgramIncludeCourseIdsAndPrerequisitesType,
    programCheminot: ProgramCheminot,
  ): Promise<void> {
    for (const courseCheminot of programCheminot.courses) {
      const existingCourse = await this.courseService.getCourse({ code: courseCheminot.code });
      if (!existingCourse) continue;
      await this.handleProgramCourseUpsertion(programDB, existingCourse, courseCheminot);
    }
  }

  private async handleProgramCourseUpsertion(
    programDB: ProgramIncludeCourseIdsAndPrerequisitesType,
    existingCourse: Course,
    courseCheminot: CourseCheminot,
  ): Promise<void> {
    const programCourse = programDB.courses.find((pc) => pc.course.code === courseCheminot.code);
    if (programCourse) {
      const hasChanges = this.programCourseService.hasProgramCourseChanged(
        { typicalSessionIndex: courseCheminot.session, type: courseCheminot.type },
        { typicalSessionIndex: programCourse.typicalSessionIndex, type: programCourse.type },
        programDB.id,
        existingCourse.id,
      );
      if (hasChanges) {
        await this.programCourseService.updateProgramCourse({
          where: { courseId_programId: { courseId: existingCourse.id, programId: programDB.id } },
          data: { typicalSessionIndex: courseCheminot.session, type: courseCheminot.type },
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
