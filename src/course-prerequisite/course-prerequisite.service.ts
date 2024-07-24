import { Injectable, Logger } from '@nestjs/common';
import { CoursePrerequisite, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursePrerequisiteService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger('CoursePrerequisite service');

  public async getPrerequisites(courseId: string) {
    this.logger.log('coursePrerequisiteById');

    return this.prisma.coursePrerequisite.findMany({
      where: { courseId },
      include: { prerequisite: true },
    });
  }

  public async getAllCoursePrerequisites() {
    return this.prisma.coursePrerequisite.findMany({
      include: { prerequisite: true },
    });
  }

  public async createCoursePrerequisite(
    data: Prisma.CoursePrerequisiteCreateInput,
  ): Promise<CoursePrerequisite> {
    this.logger.log('createCoursePrerequisite', data);
    const coursePrerequisite = await this.prisma.coursePrerequisite.create({
      data,
    });

    return coursePrerequisite;
  }

  //TODO: Upsert function: receive an array of coursePrerequisites and update or create them
  // 1. Fetch all existing coursePrerequisites
  // 2. Compare with new data
  // 3. Update only if data is different

  public async updateCoursePrerequisite(params: {
    where: Prisma.CoursePrerequisiteWhereUniqueInput;
    data: Prisma.CoursePrerequisiteUpdateInput;
  }): Promise<CoursePrerequisite> {
    this.logger.log('updateCoursePrerequisite', params);
    const { data, where } = params;

    return this.prisma.coursePrerequisite.update({
      data,
      where,
    });
  }

  public async deleteCoursePrerequisite(
    where: Prisma.CoursePrerequisiteWhereUniqueInput,
  ): Promise<CoursePrerequisite> {
    return this.prisma.coursePrerequisite.delete({
      where,
    });
  }
}
