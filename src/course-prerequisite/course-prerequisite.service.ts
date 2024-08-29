import { Injectable, Logger } from '@nestjs/common';
import { CoursePrerequisite, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursePrerequisiteService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger(CoursePrerequisiteService.name);

  public async getPrerequisites(data: Prisma.CoursePrerequisiteWhereInput) {
    this.logger.log('coursePrerequisiteById', data);

    return this.prisma.coursePrerequisite.findMany({
      where: data,
      include: { prerequisite: true },
    });
  }

  public async getAllCoursePrerequisites() {
    this.logger.log('getAllCoursePrerequisites');

    return this.prisma.coursePrerequisite.findMany({
      include: { prerequisite: true },
    });
  }

  private async createCoursePrerequisite(
    data: Prisma.CoursePrerequisiteCreateInput,
  ): Promise<CoursePrerequisite> {
    this.logger.log('createCoursePrerequisite', data);

    const courseId = data.course.connect?.id;
    const prerequisiteId = data.prerequisite.connect?.id;

    if (!courseId || !prerequisiteId) {
      throw new Error('courseId and prerequisiteId must be provided.');
    }

    const existingPrerequisite =
      await this.prisma.coursePrerequisite.findUnique({
        where: {
          courseId_prerequisiteId: {
            courseId,
            prerequisiteId,
          },
        },
      });

    if (existingPrerequisite) {
      return existingPrerequisite;
    }

    return this.prisma.coursePrerequisite.create({
      data,
    });
  }

  public async createCoursePrerequisites(
    data: Prisma.CoursePrerequisiteCreateInput[],
  ): Promise<CoursePrerequisite[]> {
    this.logger.log('ensurePrerequisitesExist', data);

    const ensuredPrerequisites = await Promise.all(
      data.map((prerequisiteData) =>
        this.createCoursePrerequisite(prerequisiteData),
      ),
    );

    return ensuredPrerequisites;
  }

  public async deleteCoursePrerequisite(
    where: Prisma.CoursePrerequisiteWhereUniqueInput,
  ): Promise<CoursePrerequisite> {
    this.logger.log('deleteCoursePrerequisite', where);

    return this.prisma.coursePrerequisite.delete({
      where,
    });
  }
}
