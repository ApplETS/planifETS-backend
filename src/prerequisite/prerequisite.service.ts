import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ProgramCoursePrerequisite } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrerequisiteService {
  constructor(private readonly prisma: PrismaService) {}

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
