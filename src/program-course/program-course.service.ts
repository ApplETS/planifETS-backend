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
  ): Promise<ProgramCourse | undefined> {
    this.logger.verbose('createProgramCourse', data);

    return this.prisma.programCourse.create({
      data,
    });
  }

  public async updateProgramCourse(params: {
    where: Prisma.ProgramCourseWhereUniqueInput;
    data: Prisma.ProgramCourseUpdateInput;
  }): Promise<ProgramCourse> {
    const { data, where } = params;

    this.logger.verbose('Updating ProgramCourse', data, where);
    return this.prisma.programCourse.update({
      data: {
        ...data,
        updatedAt: new Date(),
      },
      where,
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

  public hasProgramCourseChanged(
    newCourseData: {
      typicalSessionIndex: number | null;
      type: string | null;
    },
    existingProgramCourse: {
      typicalSessionIndex: number | null;
      type: string | null;
    },
    programId: number,
    courseId: number,
  ): boolean {
    const normalizedExistingProgramCourse = {
      typicalSessionIndex: existingProgramCourse.typicalSessionIndex,
      type: existingProgramCourse.type,
    };

    const normalizedNewProgramCourseData = {
      typicalSessionIndex: newCourseData.typicalSessionIndex,
      type: newCourseData.type,
    };

    this.logger.verbose('hasProgramCourseChanged', {
      cheminotData: normalizedExistingProgramCourse,
      databaseData: normalizedNewProgramCourseData,
      programId,
      courseId,
    });

    return (
      JSON.stringify(normalizedExistingProgramCourse) !==
      JSON.stringify(normalizedNewProgramCourseData)
    );
  }
}
