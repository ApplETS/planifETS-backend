import { Injectable, Logger } from '@nestjs/common';
import {
  Availability,
  Course,
  CourseInstance,
  Prisma,
  Session,
  Trimester,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseInstanceService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(CourseInstanceService.name);

  public getCourseInstance(
    courseInstanceWhereUniqueInput: Prisma.CourseInstanceWhereUniqueInput,
  ): Promise<CourseInstance | null> {
    this.logger.verbose('courseInstanceById');

    return this.prisma.courseInstance.findUnique({
      where: courseInstanceWhereUniqueInput,
    });
  }

  public async getAllCourseInstances(): Promise<CourseInstance[]> {
    this.logger.verbose('courseInstances');

    const courseInstances = await this.prisma.courseInstance.findMany();
    return courseInstances;
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
    this.logger.verbose('getCourseInstancesByCourse', courseId);

    return this.prisma.courseInstance.findMany({
      where: { courseId },
      include: {
        course: true,
      },
    });
  }

  public async createCourseInstance(
    course: Course,
    session: Session,
    availability: Availability,
  ): Promise<CourseInstance> {
    this.logger.verbose('createCourseInstance', {
      course,
      session,
      availability,
    });

    return this.prisma.courseInstance.create({
      data: {
        course: { connect: { id: course.id } },
        session: {
          connect: {
            year_trimester: {
              year: session.year,
              trimester: session.trimester,
            },
          },
        },
        availability,
      },
    });
  }

  public async updateCourseInstanceAvailability(
    instance: CourseInstance,
    availability: Availability,
  ): Promise<void> {
    await this.prisma.courseInstance.update({
      where: {
        courseId_sessionYear_sessionTrimester: {
          courseId: instance.courseId,
          sessionYear: instance.sessionYear,
          sessionTrimester: instance.sessionTrimester,
        },
      },
      data: { availability },
    });
  }

  public async deleteCourseIsnstance(
    where: Prisma.CourseInstanceWhereUniqueInput,
  ): Promise<CourseInstance> {
    this.logger.verbose('deleteCourseInstance', where);

    return this.prisma.courseInstance.delete({
      where,
    });
  }

  public async deleteCourseInstance(
    courseId: number,
    sessionYear: number,
    sessionTrimester: Trimester,
  ): Promise<CourseInstance> {
    this.logger.verbose('deleteCourseInstance', {
      courseId,
      sessionYear,
      sessionTrimester,
    });

    return this.prisma.courseInstance.delete({
      where: {
        courseId_sessionYear_sessionTrimester: {
          courseId: courseId,
          sessionYear: sessionYear,
          sessionTrimester,
        },
      },
    });
  }
}
