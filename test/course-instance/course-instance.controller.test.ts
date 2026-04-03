import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { CourseInstanceController } from '../../src/course-instance/course-instance.controller';
import { CourseInstanceService } from '../../src/course-instance/course-instance.service';

describe('CourseInstanceController', () => {
  let app: INestApplication;
  const courseInstanceService = {
    getAllCourseInstances: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseInstanceController],
      providers: [
        {
          provide: CourseInstanceService,
          useValue: courseInstanceService,
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

  it('returns the exact payload from GET /course-instances', async () => {
    courseInstanceService.getAllCourseInstances.mockResolvedValue([
      {
        courseId: 352405,
        sessionYear: 2026,
        sessionTrimester: 'AUTOMNE',
        availability: ['JOUR'],
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-11T00:00:00.000Z'),
      },
    ]);

    const { status, body } = await request(app.getHttpServer()).get(
      '/course-instances',
    );

    expect(status).toBe(200);
    expect(body).toStrictEqual([
      {
        courseId: 352405,
        sessionYear: 2026,
        sessionTrimester: 'AUTOMNE',
        availability: ['JOUR'],
        createdAt: '2026-01-10T00:00:00.000Z',
        updatedAt: '2026-01-11T00:00:00.000Z',
      },
    ]);
  });
});
