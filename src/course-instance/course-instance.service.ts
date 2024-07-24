import { Injectable, Logger } from '@nestjs/common';
import { CourseInstance, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseInstanceService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger('CourseInstance service');

  public courseInstance(
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
}
