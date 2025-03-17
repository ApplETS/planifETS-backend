import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ProgramCourse } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ProgramCoursesDetailedDto } from './dtos/program-course-detailed.dto';
import { ProgramCourseDetailedMapper } from './mappers/program-course-detailed.mapper';
import { ProgramCourseWithPrerequisites } from './types/program-course.types';
import { ProgramCoursesDetailedQueryResult } from './types/program-course-detailed.types';

const COURSE_BASIC_SELECT = {
  code: true,
  title: true,
};

const COURSE_DETAILS_SELECT = {
  ...COURSE_BASIC_SELECT,
  credits: true,
  courseInstances: {
    select: {
      availability: true,
      sessionYear: true,
      sessionTrimester: true,
      session: true,
    },
  },
};

@Injectable()
export class ProgramCourseService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(ProgramCourseService.name);

  public async getProgramCourseWithPrerequisites(
    programCourseWhereUniqueInput: Prisma.ProgramCourseWhereUniqueInput,
  ): Promise<ProgramCourseWithPrerequisites | null> {
    this.logger.verbose('get ProgramCourse WithPrerequisites', {
      programCourseWhereUniqueInput,
    });

    return this.prisma.programCourse.findUnique({
      where: programCourseWhereUniqueInput,
      include: {
        prerequisites: {
          include: {
            prerequisite: {
              include: {
                course: true,
              },
            },
          },
        },
      },
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

  public async getProgramsCoursesDetailedByCode(
    programCodes: string | string[],
  ): Promise<{
    data: ProgramCoursesDetailedDto[];
    errors?: { invalidProgramCodes: string[] };
  }> {
    const codes = Array.isArray(programCodes) ? programCodes : [programCodes];

    if (!codes.length) {
      this.logger.error(
        'No program codes provided to getProgramsCoursesDetailedByCode',
      );
      throw new Error(
        'Program codes are required to get detailed program courses',
      );
    }

    const programs = await this.fetchProgramsWithCourses(codes);

    if (!programs.length) {
      this.logger.error('No programs found for the provided program codes', {
        programCodes: codes,
      });
      throw new Error(`No programs found for codes: ${codes.join(', ')}`);
    }

    // Prepare response data
    const mappedData = ProgramCourseDetailedMapper.toDto(programs);
    const foundCodes = programs.map((program) => program.code);
    const invalidProgramCodes = codes.filter(
      (code) => !foundCodes.includes(code),
    );

    // Build response object
    const response: {
      data: ProgramCoursesDetailedDto[];
      errors?: { invalidProgramCodes: string[] };
    } = { data: mappedData };

    if (invalidProgramCodes.length) {
      this.logger.error('Some program codes are invalid', {
        invalidProgramCodes,
      });
      response.errors = { invalidProgramCodes };
    }

    return response;
  }

  private async fetchProgramsWithCourses(
    programCodes: string[],
  ): Promise<ProgramCoursesDetailedQueryResult[]> {
    return this.prisma.program.findMany({
      where: {
        code: { in: programCodes },
      },
      select: {
        code: true,
        title: true,
        courses: {
          select: {
            courseId: true,
            type: true,
            typicalSessionIndex: true,
            unstructuredPrerequisite: true,
            course: {
              select: COURSE_DETAILS_SELECT,
            },
            prerequisites: {
              select: {
                prerequisite: {
                  select: {
                    course: {
                      select: COURSE_BASIC_SELECT,
                    },
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<ProgramCoursesDetailedQueryResult[]>;
  }
}
