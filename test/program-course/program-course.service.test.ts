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

  const courseId = 352377;
  const programId = 182848;
  const invalidId = 999999;
  const now = new Date('2026-03-26T00:00:00.000Z');

  const buildProgramCourse = (
    overrides: Partial<ProgramCourse> = {},
  ): ProgramCourse => ({
    courseId,
    programId,
    type: 'TRONC',
    typicalSessionIndex: 1,
    unstructuredPrerequisite: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const buildProgramCourseWhere = ({
    customCourseId = courseId,
    customProgramId = programId,
  }: {
    customCourseId?: number;
    customProgramId?: number;
  } = {}): Prisma.ProgramCourseWhereUniqueInput => ({
    courseId_programId: {
      courseId: customCourseId,
      programId: customProgramId,
    },
  });

  const buildProgramCourseCreateInput = (
    overrides: Partial<Prisma.ProgramCourseCreateInput> = {},
  ): Prisma.ProgramCourseCreateInput =>
    ({
      program: { connect: { id: programId } },
      course: { connect: { id: courseId } },
      type: 'TRONC',
      typicalSessionIndex: 1,
      unstructuredPrerequisite: null,
      ...overrides,
    }) as Prisma.ProgramCourseCreateInput;

  const buildProgramCourseUpdateParams = ({
    where = buildProgramCourseWhere(),
    data = { type: 'CONCE' } as Prisma.ProgramCourseUpdateInput,
  }: {
    where?: Prisma.ProgramCourseWhereUniqueInput;
    data?: Prisma.ProgramCourseUpdateInput;
  } = {}) => ({
    where,
    data,
  });

  const buildProgramQueryResult = (
    overrides: Partial<ProgramCoursesQueryResult> = {},
  ): ProgramCoursesQueryResult => ({
    id: programId,
    code: 'LOG',
    title: 'Baccalaureat en genie logiciel',
    courses: [
      {
        courseId,
        type: 'TRONC',
        typicalSessionIndex: 1,
        unstructuredPrerequisite: null,
        course: {
          id: courseId,
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

  const buildMappedProgramCourses = (
    overrides: Partial<ProgramCoursesDto> = {},
  ): ProgramCoursesDto[] => [
      {
        programCode: 'LOG',
        programTitle: 'Baccalaureat en genie logiciel',
        courses: [],
        ...overrides,
      },
    ];

  const arrangeMappedPrograms = ({
    programs = [buildProgramQueryResult()],
    mappedData = buildMappedProgramCourses(),
  }: {
    programs?: ProgramCoursesQueryResult[];
    mappedData?: ProgramCoursesDto[];
  } = {}) => {
    const mapperSpy = jest
      .spyOn(ProgramCourseMapper, 'toDto')
      .mockReturnValue(mappedData);

    prismaMock.program.findMany.mockResolvedValue(programs);

    return {
      mapperSpy,
      mappedData,
      programs,
    };
  };

  const buildProgramFindManySelectExpectation = ({
    includeId = true,
    coursesWhere,
  }: {
    includeId?: boolean;
    coursesWhere?: Prisma.ProgramCourseWhereInput;
  } = {}) =>
    expect.objectContaining({
      ...(includeId ? { id: true } : {}),
      code: true,
      title: true,
      courses: expect.objectContaining({
        ...(coursesWhere ? { where: coursesWhere } : {}),
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
    });

  const expectProgramFindManyCalledWith = ({
    where,
    includeId = true,
    coursesWhere,
  }: {
    where: Prisma.ProgramWhereInput;
    includeId?: boolean;
    coursesWhere?: Prisma.ProgramCourseWhereInput;
  }) => {
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where,
      select: buildProgramFindManySelectExpectation({
        includeId,
        coursesWhere,
      }),
    });
  };

  const mockVerboseLogger = () =>
    jest.spyOn(service['logger'], 'verbose').mockImplementation(() => undefined);

  const mockErrorLogger = () =>
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

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

  it('should get a detailed program course with the expected projection', async () => {
    const detailedProgramCourse = {
      courseId,
      programId,
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

    const result = await service.getProgramCourse(courseId, programId);

    expect(result).toEqual(detailedProgramCourse);
    expect(prismaMock.programCourse.findFirst).toHaveBeenCalledWith({
      where: {
        courseId,
        programId,
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

  it('should return null when a detailed program course does not exist', async () => {
    prismaMock.programCourse.findFirst.mockResolvedValue(null);

    const result = await service.getProgramCourse(courseId, programId);

    expect(result).toBeNull();
    expect(prismaMock.programCourse.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          courseId,
          programId,
        },
      }),
    );
  });

  it('should get a program course with prerequisites eagerly loaded', async () => {
    const where = buildProgramCourseWhere();
    const programCourseWithPrerequisites = {
      ...buildProgramCourse(),
      prerequisites: [
        {
          prerequisite: {
            ...buildProgramCourse({ courseId: 111111 }),
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

    const result = await service.getProgramCoursesByProgram(programId);

    expect(result).toEqual(records);
    expect(prismaMock.programCourse.findMany).toHaveBeenCalledWith({
      where: {
        programId,
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
    const loggerVerboseSpy = mockVerboseLogger();
    const data = buildProgramCourseCreateInput();

    prismaMock.programCourse.findFirst.mockResolvedValue(buildProgramCourse());

    const result = await service.createProgramCourse(data);

    expect(result).toBeUndefined();
    expect(prismaMock.programCourse.findFirst).toHaveBeenCalledWith({
      where: {
        programId,
        courseId,
      },
    });
    expect(prismaMock.programCourse.create).not.toHaveBeenCalled();
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'ProgramCourse already exists',
      expect.objectContaining({
        courseId,
        programId,
      }),
    );
  });

  it('should create a program course when it does not exist yet', async () => {
    const loggerVerboseSpy = mockVerboseLogger();
    const createdRecord = buildProgramCourse();
    const data = buildProgramCourseCreateInput();

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
    const loggerErrorSpy = mockErrorLogger();
    const params = buildProgramCourseUpdateParams();

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
    const loggerVerboseSpy = mockVerboseLogger();
    const params = buildProgramCourseUpdateParams();
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
    const loggerVerboseSpy = mockVerboseLogger();
    const where = buildProgramCourseWhere();
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
    const loggerVerboseSpy = mockVerboseLogger();

    const result = service.hasProgramCourseChanged(
      { typicalSessionIndex: 1, type: 'TRONC' },
      { typicalSessionIndex: 1, type: 'TRONC' },
      programId,
      courseId,
    );

    expect(result).toBe(false);
    expect(loggerVerboseSpy).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'typical session index',
      newCourseData: { typicalSessionIndex: 2, type: 'TRONC' },
      expectedChanges: {
        typicalSessionIndex: 'has changed',
        type: 'no changes',
      },
    },
    {
      name: 'type',
      newCourseData: { typicalSessionIndex: 1, type: 'CONCE' },
      expectedChanges: {
        typicalSessionIndex: 'no changes',
        type: 'has changed',
      },
    },
  ])('should detect a $name change', ({ newCourseData, expectedChanges }) => {
    const loggerVerboseSpy = mockVerboseLogger();

    const result = service.hasProgramCourseChanged(
      newCourseData,
      { typicalSessionIndex: 1, type: 'TRONC' },
      programId,
      courseId,
    );

    expect(result).toBe(true);
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'ProgramCourse has changed',
      expect.objectContaining({
        changes: expectedChanges,
        programId,
        courseId,
      }),
    );
  });

  it('should get program courses by a single program id without errors', async () => {
    const { mappedData, mapperSpy, programs } = arrangeMappedPrograms();

    const result = await service.getProgramCoursesById(programId);

    expect(result).toEqual({ data: mappedData });
    expect(mapperSpy).toHaveBeenCalledWith(programs);
    expectProgramFindManyCalledWith({
      where: {
        id: { in: [programId] },
      },
    });
  });

  it('should log an error when no program ids are provided', async () => {
    const loggerErrorSpy = mockErrorLogger();
    const { mapperSpy } = arrangeMappedPrograms({
      programs: [],
      mappedData: [],
    });

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
    const loggerErrorSpy = mockErrorLogger();
    const { mappedData } = arrangeMappedPrograms();

    const result = await service.getProgramCoursesById([programId, invalidId]);

    expect(result).toEqual({
      data: mappedData,
      errors: { invalidProgramIds: [invalidId] },
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Some program IDs are invalid',
      { invalidProgramIds: [invalidId] },
    );
  });

  it('should get programs by course ids without errors when every course id is found', async () => {
    const { mappedData } = arrangeMappedPrograms();

    const result = await service.getProgramsCoursesByCourseIds([courseId]);

    expect(result).toEqual({ data: mappedData });
    expectProgramFindManyCalledWith({
      where: {
        courses: {
          some: {
            courseId: { in: [courseId] },
          },
        },
      },
      coursesWhere: {
        courseId: { in: [courseId] },
      },
    });
  });

  it('should return invalid course ids when some requested course ids are missing', async () => {
    const loggerErrorSpy = mockErrorLogger();
    const { mappedData } = arrangeMappedPrograms();

    const result = await service.getProgramsCoursesByCourseIds([
      courseId,
      invalidId,
    ]);

    expect(result).toEqual({
      data: mappedData,
      errors: { invalidCourseIds: [invalidId] },
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Some course IDs are invalid',
      { invalidCourseIds: [invalidId] },
    );
  });
});
