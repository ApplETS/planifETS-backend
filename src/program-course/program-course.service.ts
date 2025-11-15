import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ProgramCourse } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  DetailedProgramCourseDto,
  ProgramCoursesDto,
} from './dtos/program-course.dto';
import { ProgramCourseMapper } from './mappers/program-course.mapper';
import { ProgramCourseWithPrerequisites } from './types/program-course.types';
import { ProgramCoursesQueryResult } from './types/program-course.types';

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
  constructor(private readonly prisma: PrismaService) { }

  private readonly logger = new Logger(ProgramCourseService.name);

  public async getProgramCourse(
    courseId: number,
    programId: number,
  ): Promise<DetailedProgramCourseDto | null> {
    return this.prisma.programCourse.findFirst({
      where: {
        courseId,
        programId,
      },
      select: {
        courseId: true,
        programId: true,
        type: true,
        typicalSessionIndex: true,
        unstructuredPrerequisite: true,
        course: {
          select: {
            code: true,
            title: true,
            credits: true,
            description: true,
            cycle: true,
            courseInstances: {
              select: {
                availability: true,
                sessionYear: true,
                sessionTrimester: true,
                session: {
                  select: {
                    trimester: true,
                    year: true,
                  },
                },
              },
            },
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
                  },
                },
              },
            },
          },
        },
      },
    });
  }

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
      this.logger.verbose('ProgramCourse already exists', existingProgramCourse);
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

  public async getProgramCoursesDetailedByCode(
    programCodes: string | string[],
  ): Promise<{
    data: ProgramCoursesDto[];
    errors?: { invalidProgramCodes: string[] };
  }> {
    const codes = Array.isArray(programCodes) ? programCodes : [programCodes];

    if (!codes.length) {
      this.logger.error(
        'No program codes provided to getProgramsCoursesDetailedByCode',
      );
    }

    const programs = await this.fetchProgramsWithCourses(codes);

    if (!programs.length) {
      this.logger.error('No programs found for the provided program codes', {
        programCodes: codes,
      });
    }

    const mappedData = ProgramCourseMapper.toDto(programs);
    const foundCodes = programs.map((program) => program.code);
    const invalidProgramCodes = codes.filter(
      (code) => !foundCodes.includes(code),
    );

    const response: {
      data: ProgramCoursesDto[];
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

  public async getProgramCoursesDetailedById(
    programIds: number | number[],
  ): Promise<{
    data: ProgramCoursesDto[];
    errors?: { invalidProgramIds: number[] };
  }> {
    const ids = Array.isArray(programIds) ? programIds : [programIds];

    if (!ids.length) {
      this.logger.error(
        'No program IDs provided to getProgramsCoursesDetailedById',
      );
    }

    const programs = await this.fetchProgramsWithCoursesById(ids);

    if (!programs.length) {
      this.logger.error('No programs found for the provided program IDs', {
        programIds: ids,
      });
    }

    const mappedData = ProgramCourseMapper.toDto(programs);
    const foundIds = programs.map((program) => program.id);
    const invalidProgramIds = ids.filter((id) => !foundIds.includes(id));

    const response: {
      data: ProgramCoursesDto[];
      errors?: { invalidProgramIds: number[] };
    } = { data: mappedData };

    if (invalidProgramIds.length) {
      this.logger.error('Some program IDs are invalid', {
        invalidProgramIds,
      });
      response.errors = { invalidProgramIds };
    }

    return response;
  }

  private async fetchProgramsWithCourses(
    programCodes: string[],
  ): Promise<ProgramCoursesQueryResult[]> {
    return this.prisma.program.findMany({
      where: {
        code: { in: programCodes },
      },
      select: {
        code: true,
        title: true,
        courses: {
          orderBy: {
            typicalSessionIndex: 'asc',
          },
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
    }) as Promise<ProgramCoursesQueryResult[]>;
  }

  private async fetchProgramsWithCoursesById(
    programIds: number[],
  ): Promise<ProgramCoursesQueryResult[]> {
    return this.prisma.program.findMany({
      where: {
        id: { in: programIds },
      },
      select: {
        id: true,
        code: true,
        title: true,
        courses: {
          orderBy: {
            typicalSessionIndex: 'asc',
          },
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
    }) as Promise<ProgramCoursesQueryResult[]>;
  }
}
