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

  public async getCourseInstance(
    courseInstanceWhereUniqueInput: Prisma.CourseInstanceWhereUniqueInput,
  ): Promise<CourseInstance | null> {
    this.logger.verbose('Fetching CourseInstance by unique input.');

    return this.prisma.courseInstance.findUnique({
      where: courseInstanceWhereUniqueInput,
    });
  }

  public async getCourseInstancesBySessions(
    sessions: Session[],
  ): Promise<CourseInstance[]> {
    const sessionIdentifiers = sessions.map((session) => ({
      sessionYear: session.year,
      sessionTrimester: session.trimester,
    }));

    this.logger.verbose('getCourseInstancesBySessions', sessionIdentifiers);

    return this.prisma.courseInstance.findMany({
      where: {
        OR: sessionIdentifiers.map(({ sessionYear, sessionTrimester }) => ({
          sessionYear,
          sessionTrimester,
        })),
      },
    });
  }

  public async getAllCourseInstances(): Promise<CourseInstance[]> {
    this.logger.verbose('Fetching all CourseInstances.');

    const courseInstances = await this.prisma.courseInstance.findMany();
    return courseInstances;
  }

  public async getCourseAvailability(
    courseId: number,
  ): Promise<{ session: Session; available: Availability[] }[]> {
    this.logger.verbose('Fetching Course Availability', courseId);

    const courseInstances = await this.prisma.courseInstance.findMany({
      where: { courseId },
      include: {
        session: true,
      },
    });

    return courseInstances.map((ci) => ({
      session: ci.session,
      available: ci.availability,
    }));
  }

  public async getCourseInstancesByCourse(
    courseId: number,
  ): Promise<CourseInstance[]> {
    this.logger.verbose('Fetching CourseInstances by Course ID', courseId);

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
    availability: Availability[],
  ): Promise<CourseInstance> {
    this.logger.verbose('Creating CourseInstance', {
      courseId: course.id,
      sessionYear: session.year,
      sessionTrimester: session.trimester,
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
    availability: Availability[],
  ): Promise<void> {
    this.logger.verbose('Updating CourseInstance Availability', {
      courseId: instance.courseId,
      sessionYear: instance.sessionYear,
      sessionTrimester: instance.sessionTrimester,
      availability,
    });

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

  public async deleteCourseInstance(
    courseId: number,
    sessionYear: number,
    sessionTrimester: Trimester,
  ): Promise<CourseInstance> {
    this.logger.verbose('Deleting CourseInstance', {
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
