import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Course } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger('Course service');

  public async course(
    courseWhereUniqueInput: Prisma.CourseWhereUniqueInput,
  ): Promise<Course | null> {
    this.logger.log('courseById');
    const course = await this.prisma.course.findUnique({
      where: courseWhereUniqueInput,
    });

    return course;
  }

  public async courses() {
    this.logger.log('getAllCourses');
    const courses = await this.prisma.course.findMany();

    return courses;
  }

  public async createCourse(data: Prisma.CourseCreateInput): Promise<Course> {
    this.logger.log('createCourse', data);
    const course = await this.prisma.course.create({
      data,
    });

    return course;
  }

  public async updateCourse(params: {
    where: Prisma.CourseWhereUniqueInput;
    data: Prisma.CourseUpdateInput;
  }): Promise<Course> {
    this.logger.log('updateCourse', params);
    const { data, where } = params;

    return this.prisma.course.update({
      data,
      where,
    });
  }

  public async deleteCourse(
    where: Prisma.CourseWhereUniqueInput,
  ): Promise<Course> {
    return this.prisma.course.delete({
      where,
    });
  }
}
