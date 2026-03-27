import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, ProgramCourse } from '@prisma/client';

import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramCoursesDto } from '../../src/program-course/dtos/program-course.dto';
import { ProgramCourseMapper } from '../../src/program-course/mappers/program-course.mapper';
import { ProgramCourseService } from '../../src/program-course/program-course.service';
import { ProgramCoursesQueryResult } from '../../src/program-course/types/program-course.types';

describe('ProgramCourseService', () => {
  let service: ProgramCourseService;

  let prismaMock: {
    programCourse: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    program: {
      findMany: jest.Mock;
    };
  };

  const now = new Date('2026-03-26T00:00:00.000Z');

  const buildProgramCourse = (
    overrides: Partial<ProgramCourse> = {},
  ): ProgramCourse => ({
    courseId: 352377,
    programId: 182848,
    type: 'TRONC',
    typicalSessionIndex: 1,
    unstructuredPrerequisite: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const buildProgramQueryResult = (
    overrides: Partial<ProgramCoursesQueryResult> = {},
  ): ProgramCoursesQueryResult => ({
    id: 182848,
    code: 'LOG',
    title: 'Baccalaureat en genie logiciel',
    courses: [
      {
        courseId: 352377,
        type: 'TRONC',
        typicalSessionIndex: 1,
        unstructuredPrerequisite: null,
        course: {
          id: 352377,
          code: 'LOG100',
          title: 'Introduction au genie logiciel',
          credits: 3,
          cycle: 1,
          courseInstances: [],
        },
        prerequisites: [],
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    prismaMock = {
      programCourse: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      program: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgramCourseService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ProgramCourseService>(ProgramCourseService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get a detailed program course with the expected projection', async () => {
    const detailedProgramCourse = {
      courseId: 352377,
      programId: 182848,
      type: 'TRONC',
      typicalSessionIndex: 1,
      unstructuredPrerequisite: null,
      course: {
        code: 'LOG100',
        title: 'Introduction au genie logiciel',
        credits: 3,
        description: 'Description',
        cycle: 1,
        courseInstances: [],
      },
      prerequisites: [],
    };

    prismaMock.programCourse.findFirst.mockResolvedValue(detailedProgramCourse);

    const result = await service.getProgramCourse(352377, 182848);

    expect(result).toEqual(detailedProgramCourse);
    expect(prismaMock.programCourse.findFirst).toHaveBeenCalledWith({
      where: {
        courseId: 352377,
        programId: 182848,
      },
      select: expect.objectContaining({
        courseId: true,
        programId: true,
        type: true,
        typicalSessionIndex: true,
        unstructuredPrerequisite: true,
        course: {
          select: expect.objectContaining({
            code: true,
            title: true,
            credits: true,
            description: true,
            cycle: true,
            courseInstances: {
              select: expect.objectContaining({
                availability: true,
                sessionYear: true,
                sessionTrimester: true,
                session: {
                  select: {
                    trimester: true,
                    year: true,
                  },
                },
              }),
            },
          }),
        },
        prerequisites: {
          select: {
            prerequisite: {
              select: {
                course: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      }),
    });
  });

  it('should get a program course with prerequisites eagerly loaded', async () => {
    const where: Prisma.ProgramCourseWhereUniqueInput = {
      courseId_programId: {
        courseId: 352377,
        programId: 182848,
      },
    };
    const programCourseWithPrerequisites = {
      ...buildProgramCourse(),
      prerequisites: [
        {
          prerequisite: {
            ...buildProgramCourse({ courseId: 111111, programId: 182848 }),
            course: {
              id: 111111,
              code: 'MAT145',
              title: 'Calcul differentiel',
              description: 'Description',
              credits: 4,
              cycle: 1,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      ],
    };

    prismaMock.programCourse.findUnique.mockResolvedValue(
      programCourseWithPrerequisites,
    );

    const result = await service.getProgramCourseWithPrerequisites(where);

    expect(result).toEqual(programCourseWithPrerequisites);
    expect(prismaMock.programCourse.findUnique).toHaveBeenCalledWith({
      where,
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
  });

  it('should get program courses by program id', async () => {
    const records = [buildProgramCourse()];
    prismaMock.programCourse.findMany.mockResolvedValue(records);

    const result = await service.getProgramCoursesByProgram(182848);

    expect(result).toEqual(records);
    expect(prismaMock.programCourse.findMany).toHaveBeenCalledWith({
      where: {
        programId: 182848,
      },
    });
  });

  it('should get all program courses', async () => {
    const records = [buildProgramCourse()];
    prismaMock.programCourse.findMany.mockResolvedValue(records);

    const result = await service.getAllProgramCourses();

    expect(result).toEqual(records);
    expect(prismaMock.programCourse.findMany).toHaveBeenCalledWith();
  });

  it('should not create a duplicate program course', async () => {
    const loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => undefined);
    const data = {
      program: { connect: { id: 182848 } },
      course: { connect: { id: 352377 } },
      type: 'TRONC',
      typicalSessionIndex: 1,
    } as Prisma.ProgramCourseCreateInput;

    prismaMock.programCourse.findFirst.mockResolvedValue(buildProgramCourse());

    const result = await service.createProgramCourse(data);

    expect(result).toBeUndefined();
    expect(prismaMock.programCourse.findFirst).toHaveBeenCalledWith({
      where: {
        programId: 182848,
        courseId: 352377,
      },
    });
    expect(prismaMock.programCourse.create).not.toHaveBeenCalled();
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'ProgramCourse already exists',
      expect.objectContaining({
        courseId: 352377,
        programId: 182848,
      }),
    );
  });

  it('should create a program course when it does not exist yet', async () => {
    const loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => undefined);
    const createdRecord = buildProgramCourse();
    const data = {
      program: { connect: { id: 182848 } },
      course: { connect: { id: 352377 } },
      type: 'TRONC',
      typicalSessionIndex: 1,
      unstructuredPrerequisite: null,
    } as Prisma.ProgramCourseCreateInput;

    prismaMock.programCourse.findFirst.mockResolvedValue(null);
    prismaMock.programCourse.create.mockResolvedValue(createdRecord);

    const result = await service.createProgramCourse(data);

    expect(result).toEqual(createdRecord);
    expect(prismaMock.programCourse.create).toHaveBeenCalledWith({
      data,
    });
    expect(loggerVerboseSpy).toHaveBeenCalledWith('createProgramCourse', data);
  });

  it('should return undefined when updating a missing program course', async () => {
    const loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);
    const params = {
      where: {
        courseId_programId: {
          courseId: 352377,
          programId: 182848,
        },
      } as Prisma.ProgramCourseWhereUniqueInput,
      data: {
        type: 'CONCE',
      } as Prisma.ProgramCourseUpdateInput,
    };

    prismaMock.programCourse.findUnique.mockResolvedValue(null);

    const result = await service.updateProgramCourse(params);

    expect(result).toBeUndefined();
    expect(prismaMock.programCourse.update).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'ProgramCourse not found!',
      'Where: ',
      params.where,
      'Data: ',
      params.data,
    );
  });

  it('should update an existing program course', async () => {
    const loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => undefined);
    const params = {
      where: {
        courseId_programId: {
          courseId: 352377,
          programId: 182848,
        },
      } as Prisma.ProgramCourseWhereUniqueInput,
      data: {
        type: 'CONCE',
      } as Prisma.ProgramCourseUpdateInput,
    };
    const updatedRecord = buildProgramCourse({ type: 'CONCE' });

    prismaMock.programCourse.findUnique.mockResolvedValue(buildProgramCourse());
    prismaMock.programCourse.update.mockResolvedValue(updatedRecord);

    const result = await service.updateProgramCourse(params);

    expect(result).toEqual(updatedRecord);
    expect(prismaMock.programCourse.update).toHaveBeenCalledWith(params);
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'Updating existing ProgramCourse',
      params,
    );
  });

  it('should delete a program course', async () => {
    const loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => undefined);
    const where: Prisma.ProgramCourseWhereUniqueInput = {
      courseId_programId: {
        courseId: 352377,
        programId: 182848,
      },
    };
    const deletedRecord = buildProgramCourse();

    prismaMock.programCourse.delete.mockResolvedValue(deletedRecord);

    const result = await service.deleteProgramCourse(where);

    expect(result).toEqual(deletedRecord);
    expect(prismaMock.programCourse.delete).toHaveBeenCalledWith({ where });
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'deleteProgramCourse',
      JSON.stringify(where),
    );
  });

  it('should return false when a program course has not changed', () => {
    const loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => undefined);

    const result = service.hasProgramCourseChanged(
      { typicalSessionIndex: 1, type: 'TRONC' },
      { typicalSessionIndex: 1, type: 'TRONC' },
      182848,
      352377,
    );

    expect(result).toBe(false);
    expect(loggerVerboseSpy).not.toHaveBeenCalled();
  });

  it('should detect a typical session index change', () => {
    const loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => undefined);

    const result = service.hasProgramCourseChanged(
      { typicalSessionIndex: 2, type: 'TRONC' },
      { typicalSessionIndex: 1, type: 'TRONC' },
      182848,
      352377,
    );

    expect(result).toBe(true);
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'ProgramCourse has changed',
      expect.objectContaining({
        changes: {
          typicalSessionIndex: 'has changed',
          type: 'no changes',
        },
        programId: 182848,
        courseId: 352377,
      }),
    );
  });

  it('should detect a type change', () => {
    const loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => undefined);

    const result = service.hasProgramCourseChanged(
      { typicalSessionIndex: 1, type: 'CONCE' },
      { typicalSessionIndex: 1, type: 'TRONC' },
      182848,
      352377,
    );

    expect(result).toBe(true);
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'ProgramCourse has changed',
      expect.objectContaining({
        changes: {
          typicalSessionIndex: 'no changes',
          type: 'has changed',
        },
      }),
    );
  });

  it('should get program courses by a single program id without errors', async () => {
    const programs = [buildProgramQueryResult()];
    const mappedData: ProgramCoursesDto[] = [
      {
        programCode: 'LOG',
        programTitle: 'Baccalaureat en genie logiciel',
        courses: [],
      },
    ];
    const mapperSpy = jest
      .spyOn(ProgramCourseMapper, 'toDto')
      .mockReturnValue(mappedData);

    prismaMock.program.findMany.mockResolvedValue(programs);

    const result = await service.getProgramCoursesById(182848);

    expect(result).toEqual({ data: mappedData });
    expect(mapperSpy).toHaveBeenCalledWith(programs);
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [182848] },
      },
      select: expect.objectContaining({
        id: true,
        code: true,
        title: true,
        courses: expect.objectContaining({
          orderBy: {
            typicalSessionIndex: 'asc',
          },
          select: expect.objectContaining({
            courseId: true,
            type: true,
            typicalSessionIndex: true,
            unstructuredPrerequisite: true,
            course: {
              select: expect.objectContaining({
                id: true,
                code: true,
                title: true,
                credits: true,
                cycle: true,
                courseInstances: expect.any(Object),
              }),
            },
            prerequisites: expect.any(Object),
          }),
        }),
      }),
    });
  });

  it('should log an error when no program ids are provided', async () => {
    const loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);
    const mapperSpy = jest
      .spyOn(ProgramCourseMapper, 'toDto')
      .mockReturnValue([]);

    prismaMock.program.findMany.mockResolvedValue([]);

    const result = await service.getProgramCoursesById([]);

    expect(result).toEqual({ data: [] });
    expect(mapperSpy).toHaveBeenCalledWith([]);
    expect(loggerErrorSpy).toHaveBeenNthCalledWith(
      1,
      'No program IDs provided to getProgramCoursesById',
    );
    expect(loggerErrorSpy).toHaveBeenNthCalledWith(
      2,
      'No programs found for the provided program IDs',
      { programIds: [] },
    );
  });

  it('should return invalid program ids when some requested programs are missing', async () => {
    const loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);
    const programs = [buildProgramQueryResult()];
    const mappedData: ProgramCoursesDto[] = [
      {
        programCode: 'LOG',
        programTitle: 'Baccalaureat en genie logiciel',
        courses: [],
      },
    ];

    jest.spyOn(ProgramCourseMapper, 'toDto').mockReturnValue(mappedData);
    prismaMock.program.findMany.mockResolvedValue(programs);

    const result = await service.getProgramCoursesById([182848, 999999]);

    expect(result).toEqual({
      data: mappedData,
      errors: { invalidProgramIds: [999999] },
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Some program IDs are invalid',
      { invalidProgramIds: [999999] },
    );
  });

  it('should get programs by course ids without errors when every course id is found', async () => {
    const programs = [buildProgramQueryResult()];
    const mappedData: ProgramCoursesDto[] = [
      {
        programCode: 'LOG',
        programTitle: 'Baccalaureat en genie logiciel',
        courses: [],
      },
    ];

    jest.spyOn(ProgramCourseMapper, 'toDto').mockReturnValue(mappedData);
    prismaMock.program.findMany.mockResolvedValue(programs);

    const result = await service.getProgramsCoursesByCourseIds([352377]);

    expect(result).toEqual({ data: mappedData });
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        courses: {
          some: {
            courseId: { in: [352377] },
          },
        },
      },
      select: expect.objectContaining({
        id: true,
        code: true,
        title: true,
        courses: expect.objectContaining({
          where: {
            courseId: { in: [352377] },
          },
          orderBy: {
            typicalSessionIndex: 'asc',
          },
          select: expect.objectContaining({
            courseId: true,
            type: true,
            typicalSessionIndex: true,
            unstructuredPrerequisite: true,
            course: {
              select: expect.objectContaining({
                id: true,
                code: true,
                title: true,
                credits: true,
                cycle: true,
                courseInstances: expect.any(Object),
              }),
            },
            prerequisites: expect.any(Object),
          }),
        }),
      }),
    });
  });

  it('should return invalid course ids when some requested course ids are missing', async () => {
    const loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);
    const programs = [buildProgramQueryResult()];
    const mappedData: ProgramCoursesDto[] = [
      {
        programCode: 'LOG',
        programTitle: 'Baccalaureat en genie logiciel',
        courses: [],
      },
    ];

    jest.spyOn(ProgramCourseMapper, 'toDto').mockReturnValue(mappedData);
    prismaMock.program.findMany.mockResolvedValue(programs);

    const result = await service.getProgramsCoursesByCourseIds([
      352377,
      999999,
    ]);

    expect(result).toEqual({
      data: mappedData,
      errors: { invalidCourseIds: [999999] },
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Some course IDs are invalid',
      { invalidCourseIds: [999999] },
    );
  });

  it('should cover the private fetchProgramsWithCourses query builder', async () => {
    const programs = [buildProgramQueryResult()];
    prismaMock.program.findMany.mockResolvedValue(programs);

    // @ts-expect-error Accessing a private method for targeted coverage
    const result = await service.fetchProgramsWithCourses(['LOG', 'GTI']);

    expect(result).toEqual(programs);
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        code: { in: ['LOG', 'GTI'] },
      },
      select: expect.objectContaining({
        code: true,
        title: true,
        courses: expect.objectContaining({
          orderBy: {
            typicalSessionIndex: 'asc',
          },
          select: expect.objectContaining({
            courseId: true,
            type: true,
            typicalSessionIndex: true,
            unstructuredPrerequisite: true,
            course: {
              select: expect.objectContaining({
                id: true,
                code: true,
                title: true,
                credits: true,
                cycle: true,
                courseInstances: expect.any(Object),
              }),
            },
            prerequisites: expect.any(Object),
          }),
        }),
      }),
    });
  });
});
