import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Program, ProgramType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ProgramIncludeCourseIdsAndPrerequisitesType } from './program.types';

@Injectable()
export class ProgramService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(ProgramService.name);

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
    ProgramIncludeCourseIdsAndPrerequisitesType[]
  > {
    const data = await this.prisma.program.findMany({
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
            typicalSessionIndex: true,
            type: true,
            prerequisites: {
              select: {
                prerequisite: {
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
            },
          },
        },
      },
    });

    return data;
  }

  public async getProgramCoursesByCode(code: string): Promise<Program | null> {
    return this.prisma.program.findFirst({
      where: { code },
      include: {
        courses: {
          orderBy: {
            typicalSessionIndex: 'asc',
          },
          include: {
            course: {
              select: {
                code: true,
                title: true,
                credits: true,
                cycle: true,
              },
            },
            prerequisites: {
              select: {
                prerequisite: {
                  select: {
                    course: {
                      select: {
                        code: true,
                        title: true,
                        description: true,
                        credits: true,
                        cycle: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  public async getProgramByCode(code: string): Promise<Program | null> {
    this.logger.verbose('getProgramByCode', code);

    return this.prisma.program.findFirst({
      where: {
        code,
      },
    });
  }

  public async getProgramsByHoraireParsablePDF(): Promise<Program[]> {
    this.logger.verbose('Fetching programs with isHorairePdfParsable = true');
    const programs = await this.prisma.program.findMany({
      where: {
        isHorairePdfParsable: true,
      },
    });

    if (programs.length === 0 || programs == null) {
      this.logger.error('No programs found with isHorairePdfParsable = true');
    } else {
      this.logger.verbose(
        `Found ${programs.length} programs with isHorairePdfParsable = true.`,
      );
    }
    return programs;
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
    try {
      // Fetch existing program types by their IDs
      const existingProgramTypes = await this.prisma.programType.findMany({
        where: {
          id: { in: types.map((type) => type.id) },
        },
        select: { id: true },
      });

      // Create a Set of existing IDs for efficient lookup
      const existingIds = new Set(existingProgramTypes.map((type) => type.id));

      // Filter out types that already exist
      const newTypes = types.filter((type) => !existingIds.has(type.id));

      // Bulk create only the new program types
      if (newTypes.length > 0) {
        await this.prisma.programType.createMany({
          data: newTypes.map((type) => ({
            id: type.id,
            title: type.title,
          })),
        });
        this.logger.log(`Created ${newTypes.length} new program types.`);
        this.logger.verbose('New program types:', newTypes);
      } else {
        this.logger.log('No new program types to create.');
      }
    } catch (error) {
      this.logger.error('Error in createProgramTypes:', error);
    }
  }

  public async updateProgramsByCodes(
    codes: string[],
    data: Prisma.ProgramUpdateInput,
  ): Promise<number> {
    this.logger.verbose('Starting updateProgramsByCodes', { codes, data });

    const result = await this.prisma.program.updateMany({
      where: { code: { in: codes } },
      data,
    });

    if (result.count === 0) {
      this.logger.error(`No programs found with codes: "${codes.join(', ')}"`);
    } else if (result.count < codes.length) {
      // Identify which codes were not found
      const existingPrograms = await this.prisma.program.findMany({
        where: { code: { in: codes } },
        select: { code: true },
      });
      const existingCodes = existingPrograms.map((p) => p.code);
      const missingCodes = codes.filter(
        (code) => !existingCodes.includes(code),
      );

      this.logger.warn(
        `Some programs were not found and thus not updated: "${missingCodes.join(', ')}"`,
      );
    }

    return result.count;
  }
}
