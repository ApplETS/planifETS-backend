import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ProgramCourse } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramCourseService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger(ProgramCourseService.name);

  public async getProgramCourse(
    programCourseWhereUniqueInput: Prisma.ProgramCourseWhereUniqueInput,
  ): Promise<ProgramCourse | null> {
    this.logger.verbose('getProgramCourse', programCourseWhereUniqueInput);

    return this.prisma.programCourse.findUnique({
      where: programCourseWhereUniqueInput,
    });
  }

  public async getProgramCoursesByProgram(
    programId: number,
  ): Promise<ProgramCourse[]> {
    this.logger.verbose('getProgramCoursesByProgram', programId);

    return this.prisma.programCourse.findMany({
      where: {
        programId,
      },
    });
  }

  public async getAllProgramCourses(): Promise<ProgramCourse[]> {
    this.logger.verbose('getAllProgramCourses');

    return this.prisma.programCourse.findMany();
  }

  public async createProgramCourse(
    data: Prisma.ProgramCourseCreateInput,
  ): Promise<ProgramCourse> {
    this.logger.verbose('createProgramCourse', data);

    return this.prisma.programCourse.create({
      data,
    });
  }

  //FIXME: Make it upsertProgramCourses to limit nb of requests to the db

  public async upsertProgramCourse(
    courseId: number,
    programId: number,
    typicalSessionIndex: number,
    prerequisites: Prisma.CoursePrerequisiteCreateInput[],
  ): Promise<ProgramCourse> {
    this.logger.verbose(
      `Upserting ProgramCourse for Course: ${courseId}, Program: ${programId}`,
    );

    return this.prisma.programCourse.upsert({
      where: {
        courseId_programId: {
          courseId,
          programId,
        },
      },
      update: {
        typicalSessionIndex,
        prerequisites: {
          deleteMany: {}, // Remove existing prerequisites to replace with updated ones
          create: prerequisites,
        },
      },
      create: {
        course: { connect: { id: courseId } },
        program: { connect: { id: programId } },
        typicalSessionIndex,
        prerequisites: {
          create: prerequisites,
        },
      },
    });
  }

  public async deleteProgramCourse(
    where: Prisma.ProgramCourseWhereUniqueInput,
  ): Promise<ProgramCourse> {
    this.logger.verbose('deleteProgramCourse', JSON.stringify(where));
    return this.prisma.programCourse.delete({
      where,
    });
  }
}
