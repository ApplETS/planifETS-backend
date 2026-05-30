import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { TokenStatsController } from '../../src/course/token-stats.controller';
import { TokenStatsService } from '../../src/course/token-stats.service';

describe('TokenStatsController', () => {
  let app: INestApplication;
  const tokenStatsService = {
    getTokenStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokenStatsController],
      providers: [
        {
          provide: TokenStatsService,
          useValue: tokenStatsService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  it('returns the token-stats payload from the service', async () => {
    const zeroDistribution = { min: 0, max: 0, mean: 0, median: 0, p90: 0, p95: 0, p99: 0 };
    const stats = {
      total: 4,
      count: 3,
      emptyCount: 1,
      characters: { min: 10, max: 30, mean: 20, median: 20, p90: 28, p95: 29, p99: 30 },
      estimatedTokens: { min: 3, max: 8, mean: 5, median: 5, p90: 7, p95: 8, p99: 8 },
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
    };
    tokenStatsService.getTokenStats.mockResolvedValue(stats);

    const { status, body } = await request(app.getHttpServer())
      .get('/courses/token-stats');

    expect(status).toBe(200);
    expect(body).toStrictEqual(stats);
    expect(tokenStatsService.getTokenStats).toHaveBeenCalledWith();
  });
});
