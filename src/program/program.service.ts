import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Program, ProgramType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger(ProgramService.name);

  public async getProgram(
    programWhereUniqueInput: Prisma.ProgramWhereUniqueInput,
  ): Promise<Program | null> {
    this.logger.log('getProgram', programWhereUniqueInput);

    return this.prisma.program.findUnique({
      where: programWhereUniqueInput,
    });
  }

  public async getAllPrograms(): Promise<Program[]> {
    this.logger.log('getAllPrograms');

    return this.prisma.program.findMany();
  }

  public async createProgram(
    data: Prisma.ProgramCreateInput,
  ): Promise<Program> {
    this.logger.log('createProgram', data);

    return this.prisma.program.create({
      data: {
        ...data,
        programTypeIds: data.programTypeIds ?? '[]',
      },
    });
  }

  public async upsertProgram(
    data: Prisma.ProgramCreateInput,
  ): Promise<Program> {
    this.logger.log('upsertProgram', data);

    return this.prisma.program.upsert({
      where: { id: data.id },
      update: {
        ...data,
        updatedAt: new Date(),
        programTypeIds: data.programTypeIds ?? '[]',
      },
      create: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        programTypeIds: data.programTypeIds ?? '[]',
      },
    });
  }

  public async upsertPrograms(
    data: Prisma.ProgramCreateInput[],
  ): Promise<Program[]> {
    this.logger.log('upsertPrograms', data);
    return Promise.all(
      data.map((programData) => this.upsertProgram(programData)),
    );
  }

  public async createProgramTypes(types: ProgramType[]): Promise<void> {
    this.logger.log('createProgramTypes', types);

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
    this.logger.log('deleteProgram', JSON.stringify(where));
    return this.prisma.program.delete({
      where,
    });
  }
}
