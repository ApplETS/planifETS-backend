import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { CourseController } from '../../src/course/course.controller';
import { CourseService } from '../../src/course/course.service';

describe('CourseController', () => {
  let app: INestApplication;
  const courseService = {
    getAllCourses: jest.fn(),
    searchCourses: jest.fn(),
    getCoursesByCodes: jest.fn(),
    getCourse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: courseService,
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

  it('parses semicolon-delimited programCodes and paging params for course search', async () => {
    courseService.searchCourses.mockImplementation(
      async (query, programCodes, limit, offset) => ({
        normalizedQuery: query,
        normalizedProgramCodes: programCodes ?? null,
        normalizedLimit: limit ?? null,
        normalizedOffset: offset ?? null,
      }),
    );

    const { status, body } = await request(app.getHttpServer())
      .get('/courses/search')
      .query({
        query: 'LOG',
        programCodes: '7084;1822;',
        limit: '10',
        offset: '20',
      });

    expect(status).toBe(200);
    expect(body).toStrictEqual({
      normalizedQuery: 'LOG',
      normalizedProgramCodes: ['7084', '1822'],
      normalizedLimit: 10,
      normalizedOffset: 20,
    });
  });

  it('defaults the search query to an empty string when it is omitted', async () => {
    courseService.searchCourses.mockImplementation(
      async (query, programCodes, limit, offset) => ({
        normalizedQuery: query,
        normalizedProgramCodes: programCodes ?? null,
        normalizedLimit: limit ?? null,
        normalizedOffset: offset ?? null,
      }),
    );

    const { status, body } = await request(app.getHttpServer())
      .get('/courses/search');

    expect(status).toBe(200);
    expect(body).toStrictEqual({
      normalizedQuery: '',
      normalizedProgramCodes: null,
      normalizedLimit: null,
      normalizedOffset: null,
    });
  });

  it('parses semicolon-delimited codes and drops blank values', async () => {
    courseService.getCoursesByCodes.mockImplementation(async (codes) =>
      codes.map((code: string) => ({ code })),
    );

    const { status, body } = await request(app.getHttpServer())
      .get('/courses/codes')
      .query({ codes: 'LOG121;;MAT145' });

    expect(status).toBe(200);
    expect(body).toStrictEqual([
      { code: 'LOG121' },
      { code: 'MAT145' },
    ]);
  });

  it('parses repeated codes query params and drops blank values', async () => {
    courseService.getCoursesByCodes.mockImplementation(async (codes) =>
      codes.map((code: string) => ({ code })),
    );

    const { status, body } = await request(app.getHttpServer())
      .get('/courses/codes')
      .query({ codes: ['LOG121', '', 'MAT145'] });

    expect(status).toBe(200);
    expect(body).toStrictEqual([
      { code: 'LOG121' },
      { code: 'MAT145' },
    ]);
  });

  it('defaults codes to an empty array when the query param is missing', async () => {
    courseService.getCoursesByCodes.mockResolvedValue([]);

    const { status, body } = await request(app.getHttpServer())
      .get('/courses/codes');

    expect(status).toBe(200);
    expect(body).toStrictEqual([]);
  });
});
