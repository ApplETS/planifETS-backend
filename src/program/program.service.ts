import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  private logger = new Logger('Program service');

  public async getProgram(
    programWhereUniqueInput: Prisma.ProgramWhereUniqueInput,
  ): Promise<Program | null> {
    this.logger.log('programById');
    const program = await this.prisma.program.findUnique({
      where: programWhereUniqueInput,
    });
    return program;
  }

  public async getAllPrograms() {
    this.logger.log('getAllPrograms');
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
}
