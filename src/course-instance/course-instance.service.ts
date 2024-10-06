import { Injectable, Logger } from '@nestjs/common';
import { CourseInstance, Prisma, Session } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseInstanceService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(CourseInstanceService.name);

  public getCourseInstance(
    courseInstanceWhereUniqueInput: Prisma.CourseInstanceWhereUniqueInput,
  ): Promise<CourseInstance | null> {
    this.logger.log('courseInstanceById');

    return this.prisma.courseInstance.findUnique({
      where: courseInstanceWhereUniqueInput,
    });
  }

  public async getAllCourseInstances(): Promise<CourseInstance[]> {
    this.logger.log('courseInstances');

    const courseInstances = await this.prisma.courseInstance.findMany();
    return courseInstances;
  }

  public async getCourseInstancesBySessions(
    sessionIds: string[],
  ): Promise<CourseInstance[]> {
    this.logger.log('getCourseInstancesBySessions', JSON.stringify(sessionIds));

    return this.prisma.courseInstance.findMany({
      where: {
        sessionId: {
          in: sessionIds,
        },
      },
    });
  }

  public async getCourseAvailability(
    courseId: number,
  ): Promise<{ session: Session; available: boolean }[]> {
    this.logger.verbose('getCourseAvailability', courseId);

    const courseInstances = await this.prisma.courseInstance.findMany({
      where: { courseId },
      include: {
        session: true,
      },
    });

    return courseInstances.map((ci) => ({
      session: ci.session,
      available: true,
    }));
  }

  public async getCourseInstancesByCourse(
    courseId: number,
  ): Promise<CourseInstance[]> {
    this.logger.log('getCourseInstancesByCourse', courseId);

    return this.prisma.courseInstance.findMany({
      where: { courseId },
      include: {
        course: true,
      },
    });
  }

  public async createCourseInstance(
    data: Prisma.CourseInstanceCreateInput,
  ): Promise<CourseInstance> {
    this.logger.log('createCourseInstance', data);
    const courseInstance = await this.prisma.courseInstance.create({
      data,
    });
    return courseInstance;
  }

  public async updateCourseInstance(params: {
    where: Prisma.CourseInstanceWhereUniqueInput;
    data: Prisma.CourseInstanceUpdateInput;
  }): Promise<CourseInstance> {
    this.logger.log('updateCourseInstance', params);

    const { data, where } = params;
    return this.prisma.courseInstance.update({
      data,
      where,
    });
  }

  public async deleteCourseInstance(
    where: Prisma.CourseInstanceWhereUniqueInput,
  ): Promise<CourseInstance> {
    this.logger.log('deleteCourseInstance', where);

    return this.prisma.courseInstance.delete({
      where,
    });
  }

  public async deleteCourseInstancesBySession(
    sessionId: string,
  ): Promise<Prisma.BatchPayload> {
    this.logger.log('deleteCourseInstancesBySession', sessionId);

    return this.prisma.courseInstance.deleteMany({
      where: { sessionId },
    });
  }
}
