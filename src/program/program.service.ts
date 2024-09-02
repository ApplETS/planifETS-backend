import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Program, ProgramType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type AllProgramIncludeCourseIdsAndPrerequisites = {
  id: number;
  code: string | null;
  courses: {
    course: {
      id: number;
      code: string;
    };
  }[];
};

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger(ProgramService.name);

  public async getProgram(
    programWhereUniqueInput: Prisma.ProgramWhereUniqueInput,
  ): Promise<Program | null> {
    this.logger.verbose('getProgram', programWhereUniqueInput);

    return this.prisma.program.findUnique({
      where: programWhereUniqueInput,
    });
  }

  public async getAllPrograms(): Promise<Program[]> {
    this.logger.verbose('getAllPrograms');

    return this.prisma.program.findMany();
  }

  public async getAllProgramsWithCourses(): Promise<
    AllProgramIncludeCourseIdsAndPrerequisites[]
  > {
    this.logger.verbose('getAllProgramsWithCourses');

    return this.prisma.program.findMany({
      select: {
        id: true,
        code: true,
        courses: {
          select: {
            course: {
              select: {
                id: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  public async createProgram(
    data: Prisma.ProgramCreateInput,
  ): Promise<Program> {
    this.logger.verbose('createProgram', data);

    return this.prisma.program.create({
      data,
    });
  }

  public async upsertProgram(
    data: Prisma.ProgramCreateInput,
  ): Promise<Program> {
    this.logger.verbose('upsertProgram: ' + data.code);

    return this.prisma.program.upsert({
      where: { id: data.id },
      update: {
        ...data,
        updatedAt: new Date(),
        programTypes: {
          set: data.programTypes?.connect || [], //clears all relations and set new ones
        },
      },
      create: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        programTypes: {
          connect: data.programTypes?.connect || [],
        },
      },
    });
  }

  public async upsertPrograms(
    data: Prisma.ProgramCreateInput[],
  ): Promise<Program[]> {
    return Promise.all(
      data.map((programData) => this.upsertProgram(programData)),
    );
  }

  public async createProgramTypes(types: ProgramType[]): Promise<void> {
    this.logger.verbose('createProgramTypes', types);

    await Promise.all(
      types.map((type) =>
        this.prisma.programType.upsert({
          where: { id: type.id },
          update: { title: type.title },
          create: {
            id: type.id,
            title: type.title,
          },
        }),
      ),
    );
  }

  public async deleteProgram(
    where: Prisma.ProgramWhereUniqueInput,
  ): Promise<Program> {
    this.logger.verbose('deleteProgram', JSON.stringify(where));
    return this.prisma.program.delete({
      where,
    });
  }
}
