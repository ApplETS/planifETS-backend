import { Logger } from '@nestjs/common';
import { Availability, Course, Prisma, Trimester } from '@prisma/client';

import { CourseRepository } from '../../src/course/course.repository';
import { CourseService } from '../../src/course/course.service';
import { CourseSearchResult } from '../../src/course/course.types';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseService', () => {
  let service: CourseService;
  let serviceLogger: Logger;
  let prismaMock: {
    $transaction: jest.Mock;
    course: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
    program: {
      findMany: jest.Mock;
    };
  };
  let courseRepositoryMock: {
    searchCourses: jest.Mock;
  };

  const buildCourse = (overrides: Partial<Course> = {}): Course => ({
    id: 352405,
    code: 'LOG121',
    title: 'Conception orientee objet',
    description: 'Introduction a la conception orientee objet.',
    credits: 3,
    cycle: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const buildCreateInput = (
    overrides: Partial<Prisma.CourseCreateInput> = {},
  ): Prisma.CourseCreateInput => ({
    id: 352405,
    code: 'LOG121',
    title: 'Conception orientee objet',
    description: 'Introduction a la conception orientee objet.',
    credits: 3,
    cycle: 1,
    ...overrides,
  });

  const buildSearchResult = (
    overrides: Partial<CourseSearchResult> = {},
  ): CourseSearchResult =>
    ({
      ...buildCourse(),
      courseInstances: [
        {
          session: {
            trimester: Trimester.AUTOMNE,
            year: 2025,
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            updatedAt: new Date('2025-01-01T00:00:00.000Z'),
          },
          courseId: 352405,
          sessionYear: 2025,
          sessionTrimester: Trimester.AUTOMNE,
          availability: [Availability.JOUR],
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      ],
      programs: [
        {
          typicalSessionIndex: 2,
          type: 'TRONC',
          unstructuredPrerequisite: 'Department approval',
          prerequisites: [
            {
              prerequisite: {
                course: buildCourse({
                  id: 349710,
                  code: 'MAT145',
                  title: 'Calcul differentiel',
                  description: 'Notions de base en calcul.',
                  credits: 2,
                }),
              },
            },
          ],
        },
      ],
      ...overrides,
    }) as CourseSearchResult;

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(),
      course: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      program: {
        findMany: jest.fn(),
      },
    };

    courseRepositoryMock = {
      searchCourses: jest.fn(),
    };

    service = new CourseService(
      prismaMock as unknown as PrismaService,
      courseRepositoryMock as unknown as CourseRepository,
    );
    serviceLogger = (service as unknown as { logger: Logger }).logger;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gets a course by unique input', async () => {
    const course = buildCourse();
    prismaMock.course.findUnique.mockResolvedValue(course);

    await expect(service.getCourse({ id: 352405 })).resolves.toBe(course);
    expect(prismaMock.course.findUnique).toHaveBeenCalledWith({
      where: { id: 352405 },
    });
  });

  it('gets a course by code', async () => {
    const course = buildCourse();
    prismaMock.course.findFirst.mockResolvedValue(course);

    await expect(service.getCourseByCode('LOG121')).resolves.toBe(course);
    expect(prismaMock.course.findFirst).toHaveBeenCalledWith({
      where: { code: 'LOG121' },
    });
  });

  it('gets courses by codes and logs the lookup', async () => {
    const courses = [buildCourse(), buildCourse({ id: 352406, code: 'LOG122' })];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.course.findMany.mockResolvedValue(courses);

    await expect(
      service.getCoursesByCodes(['LOG121', 'LOG122']),
    ).resolves.toStrictEqual(courses);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('getCoursesByCodes', [
      'LOG121',
      'LOG122',
    ]);
    expect(prismaMock.course.findMany).toHaveBeenCalledWith({
      where: {
        code: {
          in: ['LOG121', 'LOG122'],
        },
      },
    });
  });

  it('gets all courses and logs the lookup', async () => {
    const courses = [buildCourse()];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.course.findMany.mockResolvedValue(courses);

    await expect(service.getAllCourses()).resolves.toStrictEqual(courses);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('getAllCourses');
    expect(prismaMock.course.findMany).toHaveBeenCalledWith();
  });

  it('gets only the fields needed for course description sync', async () => {
    const courses = [
      {
        id: 352405,
        code: 'LOG121',
        description: 'Introduction a la conception orientee objet.',
      },
    ];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.course.findMany.mockResolvedValue(courses);

    await expect(service.getCoursesForDescriptionSync()).resolves.toStrictEqual(
      courses,
    );
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'getCoursesForDescriptionSync',
    );
    expect(prismaMock.course.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        code: true,
        description: true,
      },
    });
  });

  it('gets courses by program and logs the lookup', async () => {
    const courses = [buildCourse()];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.course.findMany.mockResolvedValue(courses);

    await expect(service.getCoursesByProgram(7084)).resolves.toStrictEqual(
      courses,
    );
    expect(loggerVerboseSpy).toHaveBeenCalledWith('getCoursesByProgram', 7084);
    expect(prismaMock.course.findMany).toHaveBeenCalledWith({
      where: {
        programs: {
          some: {
            programId: 7084,
          },
        },
      },
    });
  });

  it('searches courses without program filtering when no program codes are provided', async () => {
    courseRepositoryMock.searchCourses.mockResolvedValue({
      courses: [buildSearchResult()],
      total: 1,
    });

    const result = await service.searchCourses('LOG');

    expect(prismaMock.program.findMany).not.toHaveBeenCalled();
    expect(courseRepositoryMock.searchCourses).toHaveBeenCalledWith(
      'LOG',
      undefined,
      20,
      0,
    );
    expect(result).toStrictEqual({
      courses: [
        {
          id: 352405,
          code: 'LOG121',
          title: 'Conception orientee objet',
          credits: 3,
          cycle: 1,
          sessionAvailability: [
            {
              sessionCode: 'A2025',
              availability: [Availability.JOUR],
            },
          ],
          prerequisites: [
            {
              id: 349710,
              code: 'MAT145',
              title: 'Calcul differentiel',
              credits: 2,
              cycle: 1,
            },
          ],
        },
      ],
      total: 1,
      hasMore: false,
    });
  });

  it('filters invalid program codes before delegating the course search', async () => {
    const loggerErrorSpy = jest
      .spyOn(serviceLogger, 'error')
      .mockImplementation(() => {});
    prismaMock.program.findMany.mockResolvedValue([{ code: '7084' }]);
    courseRepositoryMock.searchCourses.mockResolvedValue({
      courses: [buildSearchResult()],
      total: 5,
    });

    const result = await service.searchCourses('LOG', ['7084', '9999'], 2, 1);

    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        code: {
          in: ['7084', '9999'],
        },
      },
      select: {
        code: true,
      },
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Invalid program codes provided for course search: 9999',
      { invalidProgramCodes: ['9999'], query: 'LOG' },
    );
    expect(courseRepositoryMock.searchCourses).toHaveBeenCalledWith(
      'LOG',
      ['7084'],
      2,
      1,
    );
    expect(result).toStrictEqual({
      courses: [
        {
          id: 352405,
          code: 'LOG121',
          title: 'Conception orientee objet',
          credits: 3,
          cycle: 1,
          sessionAvailability: [
            {
              sessionCode: 'A2025',
              availability: [Availability.JOUR],
            },
          ],
          prerequisites: [
            {
              id: 349710,
              code: 'MAT145',
              title: 'Calcul differentiel',
              credits: 2,
              cycle: 1,
            },
          ],
          typicalSessionIndex: 2,
          type: 'TRONC',
          unstructuredPrerequisite: 'Department approval',
        },
      ],
      total: 5,
      hasMore: true,
    });
  });

  it('falls back to an unfiltered search when all provided program codes are invalid', async () => {
    const loggerErrorSpy = jest
      .spyOn(serviceLogger, 'error')
      .mockImplementation(() => {});
    const loggerWarnSpy = jest
      .spyOn(serviceLogger, 'warn')
      .mockImplementation(() => {});
    prismaMock.program.findMany.mockResolvedValue([]);
    courseRepositoryMock.searchCourses.mockResolvedValue({
      courses: [buildSearchResult()],
      total: 1,
    });

    const result = await service.searchCourses('LOG', ['9999']);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Invalid program codes provided for course search: 9999',
      { invalidProgramCodes: ['9999'], query: 'LOG' },
    );
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'All provided program codes were invalid. Performing search without program filtering.',
      { query: 'LOG', providedProgramCodes: ['9999'] },
    );
    expect(courseRepositoryMock.searchCourses).toHaveBeenCalledWith(
      'LOG',
      undefined,
      20,
      0,
    );
    expect(result.courses[0]).not.toHaveProperty('typicalSessionIndex');
    expect(result.courses[0]).not.toHaveProperty('type');
    expect(result.courses[0]).not.toHaveProperty('unstructuredPrerequisite');
  });

  it('creates a course and adds a creation timestamp', async () => {
    const data = buildCreateInput();
    const course = buildCourse();
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.course.create.mockResolvedValue(course);

    await expect(service.createCourse(data)).resolves.toBe(course);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('Creating new course', 'LOG121');
    expect(prismaMock.course.create).toHaveBeenCalledWith({
      data: {
        ...data,
        createdAt: expect.any(Date),
      },
    });
  });

  it('updates a course and adds an updated timestamp', async () => {
    const course = buildCourse({ title: 'Conception logicielle' });
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.course.update.mockResolvedValue(course);

    await expect(
      service.updateCourse({
        where: { id: 352405 },
        data: { code: 'LOG121', title: 'Conception logicielle' },
      }),
    ).resolves.toBe(course);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('Updating course', 'LOG121');
    expect(prismaMock.course.update).toHaveBeenCalledWith({
      where: { id: 352405 },
      data: {
        code: 'LOG121',
        title: 'Conception logicielle',
        updatedAt: expect.any(Date),
      },
    });
  });

  it('updates course descriptions in a batch transaction', async () => {
    const courses = [
      {
        id: 352405,
        code: 'LOG121',
        description: 'Updated LOG121',
      },
      {
        id: 352406,
        code: 'LOG122',
        description: 'Updated LOG122',
      },
    ];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.course.update
      .mockReturnValueOnce('update-1')
      .mockReturnValueOnce('update-2');
    prismaMock.$transaction.mockResolvedValue([
      buildCourse({ description: 'Updated LOG121' }),
      buildCourse({
        id: 352406,
        code: 'LOG122',
        title: 'Structures de donnees',
        description: 'Updated LOG122',
      }),
    ]);

    await expect(
      service.updateCourseDescriptionsBatch(courses),
    ).resolves.toStrictEqual([
      buildCourse({ description: 'Updated LOG121' }),
      buildCourse({
        id: 352406,
        code: 'LOG122',
        title: 'Structures de donnees',
        description: 'Updated LOG122',
      }),
    ]);
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'updateCourseDescriptionsBatch',
      ['LOG121', 'LOG122'],
    );
    expect(prismaMock.course.update).toHaveBeenNthCalledWith(1, {
      where: { id: 352405 },
      data: {
        code: 'LOG121',
        description: 'Updated LOG121',
        updatedAt: expect.any(Date),
      },
    });
    expect(prismaMock.course.update).toHaveBeenNthCalledWith(2, {
      where: { id: 352406 },
      data: {
        code: 'LOG122',
        description: 'Updated LOG122',
        updatedAt: expect.any(Date),
      },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      'update-1',
      'update-2',
    ]);
  });

  it('upserts multiple courses one by one using their codes as unique keys', async () => {
    const first = buildCreateInput();
    const second = buildCreateInput({
      id: 352406,
      code: 'LOG122',
      title: 'Structures de donnees',
    });
    prismaMock.course.upsert
      .mockResolvedValueOnce(buildCourse())
      .mockResolvedValueOnce(
        buildCourse({
          id: 352406,
          code: 'LOG122',
          title: 'Structures de donnees',
        }),
      );

    await expect(service.upsertCourses([first, second])).resolves.toStrictEqual([
      buildCourse(),
      buildCourse({
        id: 352406,
        code: 'LOG122',
        title: 'Structures de donnees',
      }),
    ]);
    expect(prismaMock.course.upsert).toHaveBeenNthCalledWith(1, {
      where: { code: 'LOG121' },
      update: first,
      create: first,
    });
    expect(prismaMock.course.upsert).toHaveBeenNthCalledWith(2, {
      where: { code: 'LOG122' },
      update: second,
      create: second,
    });
  });
});
