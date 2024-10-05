import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ProgramCourse } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramCourseService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(ProgramCourseService.name);

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
    const existingProgramCourse = await this.prisma.programCourse.findFirst({
      where: {
        programId: data.program.connect?.id,
        courseId: data.course.connect?.id,
      },
    });

    if (existingProgramCourse) {
      this.logger.error('ProgramCourse already exists', existingProgramCourse);
      return undefined;
    }

    this.logger.verbose('createProgramCourse', data);

    return this.prisma.programCourse.create({
      data,
    });
  }

  public async updateProgramCourse(params: {
    where: Prisma.ProgramCourseWhereUniqueInput;
    data: Prisma.ProgramCourseUpdateInput;
  }): Promise<ProgramCourse | undefined> {
    const { data, where } = params;
    const existingProgramCourse = await this.prisma.programCourse.findUnique({
      where,
    });

    if (!existingProgramCourse) {
      this.logger.error(
        'ProgramCourse not found!',
        'Where: ',
        where,
        'Data: ',
        data,
      );
      return undefined;
    }

    this.logger.verbose('Updating existing ProgramCourse', { data, where });

    return this.prisma.programCourse.update({
      data,
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
    const hasTypicalSessionIndexChanged =
      newCourseData.typicalSessionIndex !==
      existingProgramCourse.typicalSessionIndex;

    const hasTypeChanged = newCourseData.type !== existingProgramCourse.type;

    const hasChanged = hasTypicalSessionIndexChanged || hasTypeChanged;

    if (hasChanged) {
      this.logger.verbose('ProgramCourse has changed', {
        existingData: existingProgramCourse,
        newData: newCourseData,
        changes: {
          typicalSessionIndex: hasTypicalSessionIndexChanged
            ? 'has changed'
            : 'no changes',
          type: hasTypeChanged ? 'has changed' : 'no changes',
        },
        programId,
        courseId,
      });
    }

    return hasChanged;
  }
}
