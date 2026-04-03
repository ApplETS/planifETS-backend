import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ProgramCourseController } from '../../src/program-course/program-course.controller';
import { ProgramCourseService } from '../../src/program-course/program-course.service';

describe('ProgramCourseController', () => {
  let app: INestApplication;
  const programCourseService = {
    getProgramsCoursesByCourseIds: jest.fn(),
    getProgramCoursesById: jest.fn(),
    getProgramCourse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramCourseController],
      providers: [
        {
          provide: ProgramCourseService,
          useValue: programCourseService,
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

  it('parses repeated courseIds query params into numbers', async () => {
    programCourseService.getProgramsCoursesByCourseIds.mockImplementation(
      async (courseIds) => ({
        data: courseIds.map((courseId: number) => ({
          programCode: `COURSE-${courseId}`,
          programTitle: 'Normalized course ids',
          courses: [],
        })),
      }),
    );

    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/ids')
      .query({ courseIds: ['352377', '182848'] });

    expect(status).toBe(200);
    expect(body).toStrictEqual({
      data: [
        {
          programCode: 'COURSE-352377',
          programTitle: 'Normalized course ids',
          courses: [],
        },
        {
          programCode: 'COURSE-182848',
          programTitle: 'Normalized course ids',
          courses: [],
        },
      ],
    });
  });

  it('parses semicolon-delimited programIds before calling the service', async () => {
    programCourseService.getProgramCoursesById.mockImplementation(async (ids) => ({
      data: [
        {
          programCode: ids.join(','),
          programTitle: 'Normalized program ids',
          courses: [],
        },
      ],
    }));

    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/programs')
      .query({ programIds: '182848;183562' });

    expect(status).toBe(200);
    expect(body).toStrictEqual({
      data: [
        {
          programCode: '182848,183562',
          programTitle: 'Normalized program ids',
          courses: [],
        },
      ],
    });
  });

  it('parses repeated programIds query params into numbers', async () => {
    programCourseService.getProgramCoursesById.mockImplementation(async (ids) => ({
      data: [
        {
          programCode: ids.join(','),
          programTitle: 'Normalized program ids',
          courses: [],
        },
      ],
    }));

    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/programs')
      .query({ programIds: ['182848', '183562'] });

    expect(status).toBe(200);
    expect(body).toStrictEqual({
      data: [
        {
          programCode: '182848,183562',
          programTitle: 'Normalized program ids',
          courses: [],
        },
      ],
    });
  });

  it('returns a bad request when programIds are missing', async () => {
    const { status, body } = await request(app.getHttpServer()).get(
      '/program-courses/programs',
    );

    expect(status).toBe(400);
    expect(body).toStrictEqual({
      statusCode: 400,
      message: 'Program IDs are required to get program courses',
    });
  });

  it('returns a bad request when a program id is not numeric', async () => {
    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/programs')
      .query({ programIds: 'abc' });

    expect(status).toBe(400);
    expect(body).toStrictEqual({
      statusCode: 400,
      message: 'Program IDs must be valid numbers',
    });
  });

  it('translates an empty program lookup into a 404 payload', async () => {
    programCourseService.getProgramCoursesById.mockResolvedValue({
      data: [],
      errors: {
        invalidProgramIds: [999999],
      },
    });

    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/programs')
      .query({ programIds: '999999' });

    expect(status).toBe(404);
    expect(body).toStrictEqual({
      invalidProgramIds: [999999],
    });
  });

  it('translates a missing detailed program course into a 404 response', async () => {
    programCourseService.getProgramCourse.mockResolvedValue(null);

    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/details')
      .query({
        courseId: '352377',
        programId: '182848',
      });

    expect(status).toBe(404);
    expect(body).toStrictEqual({
      message:
        'No program-course found for courseId=352377 in programId=182848',
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('returns a parse error when detailed route params are not numeric', async () => {
    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/details')
      .query({
        courseId: 'abc',
        programId: '182848',
      });

    expect(status).toBe(400);
    expect(body).toStrictEqual({
      message: 'Validation failed (numeric string is expected)',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it.each([
    {
      name: 'courseId is missing',
      query: { programId: '182848' },
    },
    {
      name: 'programId is missing',
      query: { courseId: '352377' },
    },
  ])('returns a parse error when $name', async ({ query }) => {
    const { status, body } = await request(app.getHttpServer())
      .get('/program-courses/details')
      .query(query);

    expect(status).toBe(400);
    expect(body).toStrictEqual({
      message: 'Validation failed (numeric string is expected)',
      error: 'Bad Request',
      statusCode: 400,
    });
  });
});
