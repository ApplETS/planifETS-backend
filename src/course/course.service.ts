import { Injectable, Logger } from '@nestjs/common';
import { Course, Prisma, Session } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger(CourseService.name);

  public async getCourse(
    courseWhereUniqueInput: Prisma.CourseWhereUniqueInput,
  ): Promise<Course | null> {
    this.logger.verbose('courseById', courseWhereUniqueInput);

    const course = await this.prisma.course.findUnique({
      where: courseWhereUniqueInput,
    });

    return course;
  }

  public async getAllCourses() {
    this.logger.verbose('getAllCourses');

    return this.prisma.course.findMany();
  }

  public async getCoursesByProgram(programId: number): Promise<Course[]> {
    this.logger.verbose('getCoursesByProgram', programId);

    return this.prisma.course.findMany({
      where: {
        programs: {
          some: {
            programId,
          },
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

    const sessionAvailability = courseInstances.map((instance) => ({
      session: instance.session,
      available: true,
    }));

    return sessionAvailability;
  }

  public async createCourse(data: Prisma.CourseCreateInput): Promise<Course> {
    this.logger.verbose('createCourse', data);

    const course = await this.prisma.course.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });

    return course;
  }

  public async updateCourse(params: {
    where: Prisma.CourseWhereUniqueInput;
    data: Prisma.CourseUpdateInput;
  }): Promise<Course> {
    this.logger.verbose('updateCourse', params);

    const { data, where } = params;
    return this.prisma.course.update({
      data: {
        ...data,
        updatedAt: new Date(),
      },
      where,
    });
  }

  private async upsertCourse(
    courseData: Prisma.CourseCreateInput,
  ): Promise<Course> {
    const existingCourse = await this.prisma.course.findUnique({
      where: { id: courseData.id },
    });

    if (existingCourse) {
      if (JSON.stringify(existingCourse) !== JSON.stringify(courseData)) {
        return this.updateCourse({
          where: { id: courseData.id },
          data: courseData,
        });
      }

      return existingCourse;
    }
    return this.createCourse(courseData);
  }

  public async upsertCourses(
    data: Prisma.CourseCreateInput[],
  ): Promise<Course[]> {
    this.logger.verbose('upsertCourses', data);

    //TODO: Use "findMany" instead of "findUnique". remove upsertCourse function and only use this function only
    const upsertedCourses = await Promise.all(
      data.map((courseData) => this.upsertCourse(courseData)),
    );

    return upsertedCourses;
  }

  public async deleteCourse(
    where: Prisma.CourseWhereUniqueInput,
  ): Promise<Course> {
    this.logger.verbose('deleteCourse', where);

    return this.prisma.course.delete({
      where,
    });
  }
}
