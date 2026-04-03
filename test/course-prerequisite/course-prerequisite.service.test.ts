import { Test, TestingModule } from '@nestjs/testing';
import { Program, ProgramCourse, ProgramCoursePrerequisite } from '@prisma/client';

import { CourseService } from '../../src/course/course.service';
import { PrerequisiteService } from '../../src/prerequisite/prerequisite.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramCourseService } from '../../src/program-course/program-course.service';
import { ProgramCourseWithPrerequisites } from '../../src/program-course/types/program-course.types';

describe('PrerequisiteService', () => {
  let service: PrerequisiteService;
  const prismaMock = {
    programCoursePrerequisite: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const programCourseServiceMock = {
    getProgramCourseWithPrerequisites: jest.fn(),
    updateProgramCourse: jest.fn(),
  };
  const courseServiceMock = {
    getCourseByCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrerequisiteService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ProgramCourseService,
          useValue: programCourseServiceMock,
        },
        {
          provide: CourseService,
          useValue: courseServiceMock,
        },
      ],
    }).compile();

    service = module.get<PrerequisiteService>(PrerequisiteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('queries prerequisites by code and program id with the expected Prisma filter', async () => {
    const response = [
      {
        prerequisite: {
          course: {
            code: 'MAT145',
          },
        },
      },
    ];
    prismaMock.programCoursePrerequisite.findMany.mockResolvedValue(response);

    await expect(service.getPrerequisitesByCode('LOG430', 182848)).resolves.toStrictEqual(
      response,
    );

    expect(prismaMock.programCoursePrerequisite.findMany).toHaveBeenCalledWith({
      where: {
        programCourse: {
          course: {
            code: 'LOG430',
          },
          programId: 182848,
        },
      },
      select: {
        prerequisite: {
          select: {
            course: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });
  });

  it('returns the existing prerequisite instead of creating a duplicate', async () => {
    const existingPrerequisite: ProgramCoursePrerequisite = {
      courseId: 352405,
      programId: 7084,
      prerequisiteId: 145001,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    };
    prismaMock.programCoursePrerequisite.findUnique.mockResolvedValue(
      existingPrerequisite,
    );

    const result = await service.createPrerequisite({
      programCourse: {
        connect: {
          courseId_programId: {
            courseId: 352405,
            programId: 7084,
          },
        },
      },
      prerequisite: {
        connect: {
          courseId_programId: {
            courseId: 145001,
            programId: 7084,
          },
        },
      },
    } as never);

    expect(result).toStrictEqual(existingPrerequisite);
    expect(prismaMock.programCoursePrerequisite.create).not.toHaveBeenCalled();
  });

  it('creates a prerequisite when none exists yet', async () => {
    const createdPrerequisite: ProgramCoursePrerequisite = {
      courseId: 352405,
      programId: 7084,
      prerequisiteId: 145001,
      createdAt: new Date('2026-01-11T00:00:00.000Z'),
      updatedAt: new Date('2026-01-11T00:00:00.000Z'),
    };
    prismaMock.programCoursePrerequisite.findUnique.mockResolvedValue(null);
    prismaMock.programCoursePrerequisite.create.mockResolvedValue(
      createdPrerequisite,
    );

    const data = {
      programCourse: {
        connect: {
          courseId_programId: {
            courseId: 352405,
            programId: 7084,
          },
        },
      },
      prerequisite: {
        connect: {
          courseId_programId: {
            courseId: 145001,
            programId: 7084,
          },
        },
      },
    };

    await expect(service.createPrerequisite(data as never)).resolves.toStrictEqual(
      createdPrerequisite,
    );
    expect(prismaMock.programCoursePrerequisite.create).toHaveBeenCalledWith({
      data,
    });
  });

  it('returns false when the prerequisite already exists on the program course', async () => {
    const programCourse = {
      courseId: 352405,
      programId: 7084,
      type: 'TRONC',
      typicalSessionIndex: 1,
      unstructuredPrerequisite: null,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-10T00:00:00.000Z'),
      prerequisites: [
        {
          prerequisite: {
            course: {
              code: 'MAT145',
            },
          },
        },
      ],
    } as unknown as ProgramCourseWithPrerequisites;
    const program = {
      id: 7084,
      code: '7084',
    } as Program;

    await expect(
      service.addPrerequisiteIfNotExists(programCourse, 'MAT145', program),
    ).resolves.toBe(false);
    expect(courseServiceMock.getCourseByCode).not.toHaveBeenCalled();
    expect(
      programCourseServiceMock.getProgramCourseWithPrerequisites,
    ).not.toHaveBeenCalled();
  });

  it('adds a prerequisite when the prerequisite course and program course both exist', async () => {
    const programCourse = {
      courseId: 352405,
      programId: 7084,
      type: 'TRONC',
      typicalSessionIndex: 1,
      unstructuredPrerequisite: null,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-10T00:00:00.000Z'),
      prerequisites: [],
    } as unknown as ProgramCourseWithPrerequisites;
    const program = {
      id: 7084,
      code: '7084',
    } as Program;
    const prerequisiteCourse = {
      id: 145001,
    };
    const prerequisiteProgramCourse = {
      courseId: 145001,
      programId: 7084,
      type: 'TRONC',
      typicalSessionIndex: 1,
      unstructuredPrerequisite: null,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    } as unknown as ProgramCourse;

    courseServiceMock.getCourseByCode.mockResolvedValue(prerequisiteCourse);
    programCourseServiceMock.getProgramCourseWithPrerequisites.mockResolvedValue(
      prerequisiteProgramCourse,
    );
    prismaMock.programCoursePrerequisite.create.mockResolvedValue(
      {} as ProgramCoursePrerequisite,
    );

    await expect(
      service.addPrerequisiteIfNotExists(programCourse, 'MAT145', program),
    ).resolves.toBe(true);
    expect(prismaMock.programCoursePrerequisite.create).toHaveBeenCalledWith({
      data: {
        programCourse: {
          connect: {
            courseId_programId: {
              courseId: 352405,
              programId: 7084,
            },
          },
        },
        prerequisite: {
          connect: {
            courseId_programId: {
              courseId: 145001,
              programId: 7084,
            },
          },
        },
      },
    });
  });

  it('updates the unstructured prerequisite only when the value changes', async () => {
    programCourseServiceMock.updateProgramCourse.mockResolvedValue(
      {} as never,
    );
    const programCourse = {
      courseId: 352405,
      programId: 7084,
      type: 'TRONC',
      typicalSessionIndex: 1,
      unstructuredPrerequisite: 'old value',
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    } as unknown as ProgramCourse;

    await expect(
      service.updateUnstructuredPrerequisite(programCourse, 'new value'),
    ).resolves.toBe(1);
    expect(programCourseServiceMock.updateProgramCourse).toHaveBeenCalledWith({
      where: {
        courseId_programId: {
          courseId: 352405,
          programId: 7084,
        },
      },
      data: {
        unstructuredPrerequisite: 'new value',
      },
    });

    programCourseServiceMock.updateProgramCourse.mockClear();
    await expect(
      service.updateUnstructuredPrerequisite(programCourse, 'old value'),
    ).resolves.toBe(0);
    expect(programCourseServiceMock.updateProgramCourse).not.toHaveBeenCalled();
  });
});
