import { Logger } from '@nestjs/common';
import { Availability, Trimester } from '@prisma/client';

import { TokenStatsService } from '../../src/course/token-stats.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('TokenStatsService', () => {
  let service: TokenStatsService;
  let serviceLogger: Logger;
  let prismaMock: {
    course: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaMock = {
      course: {
        findMany: jest.fn(),
      },
    };

    service = new TokenStatsService(prismaMock as unknown as PrismaService);
    serviceLogger = (service as unknown as { logger: Logger }).logger;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('computes description-length stats and ignores empty descriptions', async () => {
    // 6 courses: 1 empty, 5 with descriptions of 100..500 chars
    // course[1] has 1 program with 2 prereqs + an unstructured prereq text
    // course[2] has 2 instances: AUTOMNE (JOUR+SOIR) and HIVER (JOUR)
    const rows = [
      { description: '', programs: [], courseInstances: [] },
      {
        description: 'a'.repeat(100),
        programs: [
          {
            unstructuredPrerequisite: 'Department approval',
            prerequisites: [{ prerequisiteId: 100 }, { prerequisiteId: 200 }],
          },
        ],
        courseInstances: [],
      },
      {
        description: 'a'.repeat(200),
        programs: [],
        courseInstances: [
          { sessionTrimester: Trimester.AUTOMNE, availability: [Availability.JOUR, Availability.SOIR] },
          { sessionTrimester: Trimester.HIVER, availability: [Availability.JOUR] },
        ],
      },
      { description: 'a'.repeat(300), programs: [], courseInstances: [] },
      { description: 'a'.repeat(400), programs: [], courseInstances: [] },
      { description: 'a'.repeat(500), programs: [], courseInstances: [] },
    ];
    prismaMock.course.findMany.mockResolvedValue(rows);

    const stats = await service.getTokenStats();

    expect(prismaMock.course.findMany).toHaveBeenCalledWith({
      select: {
        description: true,
        programs: {
          select: {
            prerequisites: { select: { prerequisiteId: true } },
            unstructuredPrerequisite: true,
          },
        },
        courseInstances: {
          select: {
            sessionTrimester: true,
            availability: true,
          },
        },
      },
    });
    expect(stats.total).toBe(6);
    expect(stats.count).toBe(5);
    expect(stats.emptyCount).toBe(1);
    expect(stats.charsPerToken).toBe(4);
    expect(stats.characters).toStrictEqual({
      min: 100,
      max: 500,
      mean: 300,
      median: 300,
      p90: 460,
      p95: 480,
      p99: 496,
    });
    // ceil(len / 4): 25, 50, 75, 100, 125
    expect(stats.estimatedTokens).toStrictEqual({
      min: 25,
      max: 125,
      mean: 75,
      median: 75,
      p90: 115,
      p95: 120,
      p99: 124,
    });
    expect(stats.prerequisites).toStrictEqual({
      coursesWithPrerequisites: 1,
      coursesWithUnstructuredPrerequisite: 1,
      totalEdges: 2,
      prerequisitesPerCourse: { min: 2, max: 2, mean: 2, median: 2, p90: 2, p95: 2, p99: 2 },
    });
    expect(stats.programs).toStrictEqual({
      coursesWithPrograms: 1,
      coursesWithoutPrograms: 5,
      totalLinks: 1,
      programsPerCourse: { min: 1, max: 1, mean: 1, median: 1, p90: 1, p95: 1, p99: 1 },
    });
    expect(stats.instances).toStrictEqual({
      coursesWithInstances: 1,
      totalInstances: 2,
      instancesPerCourse: { min: 2, max: 2, mean: 2, median: 2, p90: 2, p95: 2, p99: 2 },
      byTrimester: { AUTOMNE: 1, HIVER: 1, ETE: 0 },
      byAvailability: { JOUR: 2, SOIR: 1, INTENSIF: 0 },
    });
  });

  it('logs getTokenStats', async () => {
    prismaMock.course.findMany.mockResolvedValue([]);
    const loggerVerboseSpy = jest.spyOn(serviceLogger, 'verbose').mockImplementation(() => {});

    await service.getTokenStats();

    expect(loggerVerboseSpy).toHaveBeenCalledWith('getTokenStats');
  });

  it('returns zeroed stats when no courses exist', async () => {
    prismaMock.course.findMany.mockResolvedValue([]);

    const stats = await service.getTokenStats();

    const zeroDistribution = { min: 0, max: 0, mean: 0, median: 0, p90: 0, p95: 0, p99: 0 };
    expect(stats).toStrictEqual({
      total: 0,
      count: 0,
      emptyCount: 0,
      characters: zeroDistribution,
      estimatedTokens: zeroDistribution,
      charsPerToken: 4,
      prerequisites: {
        coursesWithPrerequisites: 0,
        coursesWithUnstructuredPrerequisite: 0,
        totalEdges: 0,
        prerequisitesPerCourse: zeroDistribution,
      },
      programs: {
        coursesWithPrograms: 0,
        coursesWithoutPrograms: 0,
        totalLinks: 0,
        programsPerCourse: zeroDistribution,
      },
      instances: {
        coursesWithInstances: 0,
        totalInstances: 0,
        instancesPerCourse: zeroDistribution,
        byTrimester: { AUTOMNE: 0, HIVER: 0, ETE: 0 },
        byAvailability: { JOUR: 0, SOIR: 0, INTENSIF: 0 },
      },
    });
  });
});
