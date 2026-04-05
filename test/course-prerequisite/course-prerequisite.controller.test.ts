import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { PrerequisiteController } from '../../src/prerequisite/prerequisite.controller';
import { PrerequisiteService } from '../../src/prerequisite/prerequisite.service';

describe('PrerequisiteController', () => {
  let app: INestApplication;
  const prerequisiteService = {
    getAllCoursePrerequisites: jest.fn(),
    getPrerequisitesByCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrerequisiteController],
      providers: [
        {
          provide: PrerequisiteService,
          useValue: prerequisiteService,
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

  it('returns the exact payload from GET /prerequisites', async () => {
    prerequisiteService.getAllCoursePrerequisites.mockResolvedValue([
      {
        courseId: 352405,
        prerequisiteId: 145001,
        programId: 7084,
      },
    ]);

    const { status, body } = await request(app.getHttpServer()).get(
      '/prerequisites',
    );

    expect(status).toBe(200);
    expect(body).toStrictEqual([
      {
        courseId: 352405,
        prerequisiteId: 145001,
        programId: 7084,
      },
    ]);
  });

  it('uppercases courseCode before returning prerequisites by program course', async () => {
    prerequisiteService.getPrerequisitesByCode.mockImplementation(
      async (courseCode: string) => [
        {
          prerequisite: {
            course: {
              code: courseCode,
            },
          },
        },
      ],
    );

    const { status, body } = await request(app.getHttpServer())
      .get('/prerequisites/by-program-course')
      .query({
        programId: '182848',
        courseCode: 'log430',
      });

    expect(status).toBe(200);
    expect(body).toStrictEqual([
      {
        prerequisite: {
          course: {
            code: 'LOG430',
          },
        },
      },
    ]);
  });

  it('returns Nest validation errors for an invalid programId', async () => {
    const { status, body } = await request(app.getHttpServer())
      .get('/prerequisites/by-program-course')
      .query({
        programId: 'abc',
        courseCode: 'log430',
      });

    expect(status).toBe(400);
    expect(body).toStrictEqual({
      message: 'Validation failed (numeric string is expected)',
      error: 'Bad Request',
      statusCode: 400,
    });
  });
});
