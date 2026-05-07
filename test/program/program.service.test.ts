import { Logger } from '@nestjs/common';
import { Prisma, Program, ProgramType } from '@prisma/client';

import { PrismaService } from '../../src/prisma/prisma.service';
import { ProgramService } from '../../src/program/program.service';

describe('ProgramService', () => {
  let service: ProgramService;
  let serviceLogger: Logger;
  let prismaMock: {
    program: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
    programType: {
      findMany: jest.Mock;
      createMany: jest.Mock;
    };
  };

  const buildProgram = (overrides: Partial<Program> = {}): Program => ({
    id: 7084,
    code: '7084',
    title: 'Software Engineering',
    credits: '90',
    cycle: 1,
    url: 'https://example.com/programs/7084',
    isHorairePdfParsable: false,
    isPlanificationPdfParsable: false,
    horaireCoursPdfJson: null,
    planificationPdfJson: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const buildCreateInput = (
    overrides: Partial<Prisma.ProgramCreateInput> = {},
  ): Prisma.ProgramCreateInput => ({
    id: 7084,
    code: '7084',
    title: 'Software Engineering',
    credits: '90',
    cycle: 1,
    url: 'https://example.com/programs/7084',
    programTypes: {
      connect: [{ id: 1 }],
    },
    isHorairePdfParsable: false,
    isPlanificationPdfParsable: false,
    ...overrides,
  });

  beforeEach(() => {
    prismaMock = {
      program: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      programType: {
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    service = new ProgramService(prismaMock as unknown as PrismaService);
    serviceLogger = (service as unknown as { logger: Logger }).logger;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gets a program by unique input', async () => {
    const program = buildProgram();
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.program.findUnique.mockResolvedValue(program);

    await expect(service.getProgram({ id: 7084 })).resolves.toBe(program);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('getProgram', { id: 7084 });
    expect(prismaMock.program.findUnique).toHaveBeenCalledWith({
      where: { id: 7084 },
    });
  });

  it('gets all programs', async () => {
    const programs = [buildProgram(), buildProgram({ id: 1822, code: '1822' })];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.program.findMany.mockResolvedValue(programs);

    await expect(service.getAllPrograms()).resolves.toStrictEqual(programs);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('getAllPrograms');
    expect(prismaMock.program.findMany).toHaveBeenCalledWith();
  });

  it('filters active programs by requiring at least one course', async () => {
    prismaMock.program.findMany.mockResolvedValue([
      {
        id: 7084,
        code: '7084',
      },
    ]);

    await expect(service.getAllActivePrograms()).resolves.toStrictEqual([
      {
        id: 7084,
        code: '7084',
      },
    ]);
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        courses: {
          some: {},
        },
      },
    });
  });

  it('gets all programs with nested course and prerequisite selections', async () => {
    const programsWithCourses = [
      {
        id: 7084,
        code: '7084',
        courses: [
          {
            course: {
              id: 352405,
              code: 'LOG121',
            },
            typicalSessionIndex: 1,
            type: 'OBLIGATOIRE',
            prerequisites: [
              {
                prerequisite: {
                  course: {
                    id: 352406,
                    code: 'MAT145',
                  },
                },
              },
            ],
          },
        ],
      },
    ];
    prismaMock.program.findMany.mockResolvedValue(programsWithCourses);

    await expect(service.getAllProgramsWithCourses()).resolves.toStrictEqual(
      programsWithCourses,
    );
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
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
  });

  it('gets a program by code', async () => {
    const program = buildProgram();
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.program.findFirst.mockResolvedValue(program);

    await expect(service.getProgramByCode('7084')).resolves.toBe(program);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('getProgramByCode', '7084');
    expect(prismaMock.program.findFirst).toHaveBeenCalledWith({
      where: {
        code: '7084',
      },
    });
  });

  it('returns parsable horaire programs and logs the count', async () => {
    const programs = [buildProgram({ isHorairePdfParsable: true })];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.program.findMany.mockResolvedValue(programs);

    await expect(service.getProgramsByHoraireParsablePDF()).resolves.toBe(
      programs,
    );
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        isHorairePdfParsable: true,
      },
    });
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'Fetching programs with isHorairePdfParsable = true',
    );
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'Found 1 programs with isHorairePdfParsable = true.',
    );
  });

  it('logs an error when no horaire-parsable programs are found', async () => {
    const loggerErrorSpy = jest
      .spyOn(serviceLogger, 'error')
      .mockImplementation(() => {});
    prismaMock.program.findMany.mockResolvedValue([]);

    await expect(service.getProgramsByHoraireParsablePDF()).resolves.toStrictEqual(
      [],
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'No programs found with isHorairePdfParsable = true',
    );
  });

  it('returns parsable planification programs and logs the count', async () => {
    const programs = [buildProgram({ isPlanificationPdfParsable: true })];
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.program.findMany.mockResolvedValue(programs);

    await expect(service.getProgramsByPlanificationParsablePDF()).resolves.toBe(
      programs,
    );
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        isPlanificationPdfParsable: true,
      },
    });
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'Fetching programs with isPlanificationPdfParsable = true',
    );
    expect(loggerVerboseSpy).toHaveBeenCalledWith(
      'Found 1 programs with isPlanificationPdfParsable = true.',
    );
  });

  it('logs an error when no planification-parsable programs are found', async () => {
    const loggerErrorSpy = jest
      .spyOn(serviceLogger, 'error')
      .mockImplementation(() => {});
    prismaMock.program.findMany.mockResolvedValue([]);

    await expect(
      service.getProgramsByPlanificationParsablePDF(),
    ).resolves.toStrictEqual([]);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'No programs found with isPlanificationPdfParsable = true',
    );
  });

  it('maps programs list by course id to the public API shape', async () => {
    prismaMock.program.findMany.mockResolvedValue([
      {
        id: 7084,
        code: '7084',
        title: 'Software Engineering',
      },
      {
        id: 1822,
        code: null,
        title: 'Construction Engineering',
      },
    ]);

    await expect(service.getProgramsListByCourseId(352405)).resolves.toStrictEqual([
      {
        programId: 7084,
        programCode: '7084',
        programTitle: 'Software Engineering',
      },
      {
        programId: 1822,
        programCode: '',
        programTitle: 'Construction Engineering',
      },
    ]);
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        courses: {
          some: {
            courseId: 352405,
          },
        },
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
    });
  });

  it('creates a program', async () => {
    const data = buildCreateInput();
    const program = buildProgram();
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.program.create.mockResolvedValue(program);

    await expect(service.createProgram(data)).resolves.toBe(program);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('createProgram', data);
    expect(prismaMock.program.create).toHaveBeenCalledWith({
      data,
    });
  });

  it('upserts a program and refreshes program type relations', async () => {
    const data = buildCreateInput({
      programTypes: {
        connect: [{ id: 1 }, { id: 2 }],
      },
    });
    const program = buildProgram();
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.program.upsert.mockResolvedValue(program);

    await expect(service.upsertProgram(data)).resolves.toBe(program);
    expect(loggerVerboseSpy).toHaveBeenCalledWith('upsertProgram: 7084');
    expect(prismaMock.program.upsert).toHaveBeenCalledWith({
      where: { id: 7084 },
      update: {
        ...data,
        updatedAt: expect.any(Date),
        programTypes: {
          set: [{ id: 1 }, { id: 2 }],
        },
      },
      create: {
        ...data,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        programTypes: {
          connect: [{ id: 1 }, { id: 2 }],
        },
      },
    });
  });

  it('defaults program type relations to empty arrays when upserting without them', async () => {
    const data = {
      ...buildCreateInput(),
      programTypes: undefined,
    } as unknown as Prisma.ProgramCreateInput;
    prismaMock.program.upsert.mockResolvedValue(buildProgram());

    await service.upsertProgram(data);

    expect(prismaMock.program.upsert).toHaveBeenCalledWith({
      where: { id: 7084 },
      update: {
        ...data,
        updatedAt: expect.any(Date),
        programTypes: {
          set: [],
        },
      },
      create: {
        ...data,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        programTypes: {
          connect: [],
        },
      },
    });
  });

  it('upserts multiple programs by delegating to upsertProgram', async () => {
    const first = buildCreateInput();
    const second = buildCreateInput({
      id: 1822,
      code: '1822',
      title: 'Construction Engineering',
    });
    const upsertSpy = jest
      .spyOn(service, 'upsertProgram')
      .mockResolvedValueOnce(buildProgram())
      .mockResolvedValueOnce(
        buildProgram({
          id: 1822,
          code: '1822',
          title: 'Construction Engineering',
        }),
      );

    await expect(service.upsertPrograms([first, second])).resolves.toHaveLength(
      2,
    );
    expect(upsertSpy).toHaveBeenNthCalledWith(1, first);
    expect(upsertSpy).toHaveBeenNthCalledWith(2, second);
  });

  it('creates only missing program types and logs what was created', async () => {
    const types: ProgramType[] = [
      { id: 1, title: 'Existing type' },
      { id: 2, title: 'New type' },
      { id: 3, title: 'Another new type' },
    ];
    const loggerLogSpy = jest
      .spyOn(serviceLogger, 'log')
      .mockImplementation(() => {});
    const loggerVerboseSpy = jest
      .spyOn(serviceLogger, 'verbose')
      .mockImplementation(() => {});
    prismaMock.programType.findMany.mockResolvedValue([{ id: 1 }]);

    await expect(service.createProgramTypes(types)).resolves.toBeUndefined();
    expect(prismaMock.programType.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1, 2, 3] },
      },
      select: { id: true },
    });
    expect(prismaMock.programType.createMany).toHaveBeenCalledWith({
      data: [
        { id: 2, title: 'New type' },
        { id: 3, title: 'Another new type' },
      ],
    });
    expect(loggerLogSpy).toHaveBeenCalledWith('Created 2 new program types.');
    expect(loggerVerboseSpy).toHaveBeenCalledWith('New program types:', [
      { id: 2, title: 'New type' },
      { id: 3, title: 'Another new type' },
    ]);
  });

  it('logs when there are no new program types to create', async () => {
    const types: ProgramType[] = [
      { id: 1, title: 'Existing type' },
      { id: 2, title: 'Another existing type' },
    ];
    const loggerLogSpy = jest
      .spyOn(serviceLogger, 'log')
      .mockImplementation(() => {});
    prismaMock.programType.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(service.createProgramTypes(types)).resolves.toBeUndefined();
    expect(prismaMock.programType.createMany).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith('No new program types to create.');
  });

  it('logs and swallows errors while creating program types', async () => {
    const error = new Error('database unavailable');
    const loggerErrorSpy = jest
      .spyOn(serviceLogger, 'error')
      .mockImplementation(() => {});
    prismaMock.programType.findMany.mockRejectedValue(error);

    await expect(
      service.createProgramTypes([{ id: 1, title: 'Existing type' }]),
    ).resolves.toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error in createProgramTypes:',
      error,
    );
  });

  it('returns the update count and checks for missing codes on partial updates', async () => {
    const loggerWarnSpy = jest
      .spyOn(serviceLogger, 'warn')
      .mockImplementation(() => {});
    prismaMock.program.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.program.findMany.mockResolvedValue([{ code: '7084' }]);
    const updateData = {
      isHorairePdfParsable: true,
    } as Prisma.ProgramUpdateInput;

    await expect(
      service.updateProgramsByCodes(['7084', '1822'], updateData),
    ).resolves.toBe(1);
    expect(prismaMock.program.updateMany).toHaveBeenCalledWith({
      where: {
        code: {
          in: ['7084', '1822'],
        },
      },
      data: updateData,
    });
    expect(prismaMock.program.findMany).toHaveBeenCalledWith({
      where: {
        code: {
          in: ['7084', '1822'],
        },
      },
      select: {
        code: true,
      },
    });
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Some programs were not found in the database during updateProgramsByCodes and therefore were not updated: "1822"',
    );
  });

  it('logs an error when no program codes are updated', async () => {
    const loggerErrorSpy = jest
      .spyOn(serviceLogger, 'error')
      .mockImplementation(() => {});
    prismaMock.program.updateMany.mockResolvedValue({ count: 0 });
    const updateData = {
      isPlanificationPdfParsable: true,
    } as Prisma.ProgramUpdateInput;

    await expect(
      service.updateProgramsByCodes(['7084', '1822'], updateData),
    ).resolves.toBe(0);
    expect(prismaMock.program.findMany).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'No programs found with codes: "7084, 1822"',
    );
  });

  it('returns the update count without extra lookups when all codes are updated', async () => {
    prismaMock.program.updateMany.mockResolvedValue({ count: 2 });
    const updateData = {
      isPlanificationPdfParsable: true,
    } as Prisma.ProgramUpdateInput;

    await expect(
      service.updateProgramsByCodes(['7084', '1822'], updateData),
    ).resolves.toBe(2);
    expect(prismaMock.program.findMany).not.toHaveBeenCalled();
  });
});
