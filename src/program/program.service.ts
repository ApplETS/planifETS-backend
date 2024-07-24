import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Program, ProgramType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger('Program service');

  public async program(
    programWhereUniqueInput: Prisma.ProgramWhereUniqueInput,
  ): Promise<Program | null> {
    this.logger.log('program', programWhereUniqueInput);
    const program = await this.prisma.program.findUnique({
      where: programWhereUniqueInput,
    });

    return program;
  }

  public async programs(): Promise<Program[]> {
    this.logger.log('programs');
    const programs = await this.prisma.program.findMany();
    return programs;
  }

  public async createProgram(
    data: Prisma.ProgramCreateInput,
  ): Promise<Program> {
    this.logger.log('createProgram', data);
    const program = await this.prisma.program.create({
      data,
    });
    return program;
  }

  public async upsertProgram(
    data: Prisma.ProgramCreateInput,
  ): Promise<Program> {
    return this.prisma.program.upsert({
      where: { id: data.id },
      update: {
        title: data.title,
        code: data.code,
        credits: data.credits,
        url: data.url,
        updatedAt: new Date(),
        programType: {
          connect: { id: data.programType.connect?.id },
        },
      },
      create: {
        id: data.id,
        title: data.title,
        code: data.code,
        credits: data.credits,
        url: data.url,
        createdAt: new Date(),
        updatedAt: new Date(),
        programType: data.programType,
      },
    });
  }

  public async createProgramTypes(types: ProgramType[]): Promise<void> {
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
}
