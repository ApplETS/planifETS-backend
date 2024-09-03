import { Injectable, Logger } from '@nestjs/common';
import { CoursePrerequisite, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursePrerequisiteService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger(CoursePrerequisiteService.name);

  public async getPrerequisites(data: Prisma.CoursePrerequisiteWhereInput) {
    this.logger.verbose('Fetching course prerequisites', data);

    return this.prisma.coursePrerequisite.findMany({
      where: data,
      include: {
        programCourse: true,
        prerequisite: true,
      },
    });
  }

  public async getAllCoursePrerequisites() {
    this.logger.verbose('Fetching all course prerequisites');

    return this.prisma.coursePrerequisite.findMany({
      include: {
        programCourse: true,
        prerequisite: true,
      },
    });
  }

  private async createPrerequisite(
    data: Prisma.CoursePrerequisiteCreateInput,
  ): Promise<CoursePrerequisite> {
    this.logger.verbose('createCoursePrerequisite', data);

    const courseId = data.programCourse.connect?.courseId as number;
    const programId = data.programCourse.connect?.programId as number;
    const prerequisiteId = data.prerequisite.connect?.courseId as number;

    if (!courseId || !programId || !prerequisiteId) {
      this.logger.error(
        'courseId, programId, and prerequisiteId must be provided.',
      );
    }

    const existingPrerequisite =
      await this.prisma.coursePrerequisite.findUnique({
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

    return this.prisma.coursePrerequisite.create({
      data,
    });
  }

  public async createProgramCoursePrerequisites(
    data: Prisma.CoursePrerequisiteCreateInput[],
  ): Promise<CoursePrerequisite[]> {
    this.logger.verbose('ensurePrerequisitesExist', data);

    return Promise.all(
      data.map((prerequisiteData) => this.createPrerequisite(prerequisiteData)),
    );
  }

  public async deleteCoursePrerequisite(
    where: Prisma.CoursePrerequisiteWhereUniqueInput,
  ): Promise<CoursePrerequisite> {
    this.logger.verbose('deleteCoursePrerequisite', where);

    return this.prisma.coursePrerequisite.delete({
      where,
    });
  }
  //FIXME: It should delete the prerequisites for a specific course in a program.
  // public async deletePrerequisitesForProgramCourse(
  //   programId: number,
  // ): Promise<Prisma.BatchPayload> {
  //   this.logger.verbose('deletePrerequisitesForProgramCourse', programId);
  // }
}
