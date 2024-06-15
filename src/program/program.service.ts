import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

  public async updateProgram(
    where: Prisma.ProgramWhereUniqueInput,
    data: Prisma.ProgramUpdateInput,
  ): Promise<Program> {
    this.logger.log('updateProgram', data);
    const program = await this.prisma.program.update({
      where,
      data,
    });
    return program;
  }
}
