import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  Program,
  ProgramCourse,
  ProgramCoursePrerequisite,
} from '@prisma/client';

import { CourseService } from '../course/course.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramCourseService } from '../program-course/program-course.service';
import { ProgramCourseWithPrerequisites } from '../program-course/types/program-course.types';
import { PrerequisiteCodeDto } from './prerequisite.types';

@Injectable()
export class PrerequisiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programCourseService: ProgramCourseService,
    private readonly courseService: CourseService,
  ) {}

  private readonly logger = new Logger(PrerequisiteService.name);

  public async getPrerequisitesByCode(
    courseCode: string,
    programId: number,
  ): Promise<PrerequisiteCodeDto[]> {
    this.logger.verbose('Fetching prerequisites by course code for program', {
      courseCode,
      programId,
    });

    const prerequisiteCodes =
      await this.prisma.programCoursePrerequisite.findMany({
        where: {
          programCourse: {
            course: {
              code: courseCode,
            },
            programId,
          },
        },
        select: {
          prerequisite: {
            select: {
              course: {
                select: {
                  code: true,
                },
              },
            },
          },
        },
      });

    if (!prerequisiteCodes) {
      this.logger.error(
        `Course with code ${courseCode} not found in program with ID ${programId}`,
      );
      throw new NotFoundException(
        `Course with code ${courseCode} not found in program with ID ${programId}`,
      );
    }

    this.logger.verbose(
      `Found ${prerequisiteCodes.length} prerequisites for course ${courseCode} in program ID ${programId}`,
    );

    return prerequisiteCodes;
  }

  public async getPrerequisitesWithProgramCourseAndPrerequisite(
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

  public async deletePrerequisiteForProgramCourse(
    programId: number,
    courseId: number,
    prerequisiteId: number,
  ): Promise<number> {
    this.logger.verbose('deletePrerequisiteForProgramCourse', {
      programId,
      courseId,
      prerequisiteId,
    });

    try {
      await this.prisma.programCoursePrerequisite.delete({
        where: {
          courseId_programId_prerequisiteId: {
            programId,
            courseId,
            prerequisiteId,
          },
        },
      });
      return 1;
    } catch (error) {
      this.logger.error('Error deleting prerequisite:', error);
      return 0;
    }
  }

  public async deletePrerequisitesForProgramCourse(
    programId: number,
    courseId: number,
  ): Promise<number> {
    this.logger.verbose('deletePrerequisitesForProgramCourse', {
      programId,
      courseId,
    });

    return (
      await this.prisma.programCoursePrerequisite.deleteMany({
        where: {
          programId: programId,
          courseId: courseId,
        },
      })
    ).count;
  }
}
