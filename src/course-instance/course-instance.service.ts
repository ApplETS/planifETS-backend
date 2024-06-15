import { Injectable, Logger } from '@nestjs/common';
import { CourseInstance, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CourseInstanceService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger('CourseInstance service');

  public courseInstance(
    courseWhereUniqueInput: Prisma.CourseInstanceWhereUniqueInput,
  ): Promise<Course | null> {
    this.logger.log('courseInstanceById');

    return this.prisma.courseInstance.findUnique({
      where: courseWhereUniqueInput,
    });
  }

  public async courseInstances(): Promise<CourseInstance[]> {
    this.logger.log('courseInstances');
    const courseInstances = await this.prisma.courseInstance.findMany();
    return courseInstances;
  }
}
