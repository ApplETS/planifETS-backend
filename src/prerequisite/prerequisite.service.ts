import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  Program,
  ProgramCourse,
  ProgramCoursePrerequisite,
} from '@prisma/client';

import { CourseService } from '../course/course.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramCourseService } from '../program-course/program-course.service';
import { ProgramCourseWithPrerequisites } from '../program-course/program-course.types';

@Injectable()
export class PrerequisiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programCourseService: ProgramCourseService,
    private readonly courseService: CourseService,
  ) {}

  private readonly logger = new Logger(PrerequisiteService.name);

  public async getPrerequisites(
    data: Prisma.ProgramCoursePrerequisiteWhereInput,
  ) {
    this.logger.verbose('Fetching course prerequisites', data);

    return this.prisma.programCoursePrerequisite.findMany({
      where: data,
      include: {
        programCourse: true,
        prerequisite: true,
      },
    });
  }

  public async getAllCoursePrerequisites() {
    this.logger.verbose('Fetching all course prerequisites');

    return this.prisma.programCoursePrerequisite.findMany({
      include: {
        programCourse: true,
        prerequisite: true,
      },
    });
  }

  public async createPrerequisite(
    data: Prisma.ProgramCoursePrerequisiteCreateInput,
  ): Promise<ProgramCoursePrerequisite> {
    this.logger.verbose('createProgramCoursePrerequisite', data);

    const courseId = data.programCourse.connect?.courseId_programId
      ?.courseId as number;
    const programId = data.programCourse.connect?.courseId_programId
      ?.programId as number;
    const prerequisiteId = data.prerequisite.connect?.courseId_programId
      ?.courseId as number;

    if (!courseId) {
      this.logger.error('courseId must be provided.');
    }
    if (!programId) {
      this.logger.error('programId must be provided.');
    }
    if (!prerequisiteId) {
      this.logger.error('prerequisiteId must be provided.');
    }
    const existingPrerequisite =
      await this.prisma.programCoursePrerequisite.findUnique({
        where: {
          courseId_programId_prerequisiteId: {
            courseId,
            programId,
            prerequisiteId,
          },
        },
      });

    if (existingPrerequisite) {
      this.logger.verbose('Prerequisite already exists', existingPrerequisite);
      return existingPrerequisite;
    }

    this.logger.verbose('Creating new prerequisite', data);
    return this.prisma.programCoursePrerequisite.create({
      data,
    });
  }

  public async createPrerequisites(
    data: Prisma.ProgramCoursePrerequisiteCreateInput[],
  ): Promise<ProgramCoursePrerequisite[]> {
    return Promise.all(
      data.map((prerequisiteData) => this.createPrerequisite(prerequisiteData)),
    );
  }

  public async addPrerequisiteIfNotExists(
    programCourse: ProgramCourseWithPrerequisites,
    prerequisiteCode: string,
    program: Program,
  ): Promise<boolean> {
    const existingPrerequisiteCodes =
      programCourse.prerequisites?.map((p) => p.prerequisite.course.code) ?? [];

    if (existingPrerequisiteCodes.includes(prerequisiteCode)) {
      return false; // Prerequisite already exists
    }

    const prerequisiteCourse =
      await this.courseService.getCourseByCode(prerequisiteCode);
    if (!prerequisiteCourse) {
      this.logger.error(
        `Prerequisite course not found in database: ${prerequisiteCode}`,
      );
      return false;
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
      return false;
    }

    await this.createPrerequisite({
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

    return true; // Prerequisite was added
  }

  public async updateUnstructuredPrerequisite(
    programCourse: ProgramCourse,
    newUnstructuredPrerequisite: string | null,
  ): Promise<number> {
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
      return 1;
    }
    return 0;
  }

  public async deletePrerequisitesForProgramCourse(
    programId: number,
    courseId: number,
  ): Promise<Prisma.BatchPayload> {
    this.logger.verbose('deletePrerequisitesForProgramCourse', {
      programId,
      courseId,
    });

    return this.prisma.programCoursePrerequisite.deleteMany({
      where: {
        programId: programId,
        courseId: courseId,
      },
    });
  }
}
