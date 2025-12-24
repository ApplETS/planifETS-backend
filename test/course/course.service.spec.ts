import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Course } from '@prisma/client';
import { useContainer } from 'class-validator';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('CourseService (e2e)', () => {
  let app: INestApplication;
  let course: Course;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();

    await jestPrisma.originalClient.session.create({
      data: {
        trimester: 'AUTOMNE',
        year: 2021,
      },
    });

    course = await jestPrisma.originalClient.course.create({
      data: {
        id: 99999,
        code: 'CS101',
        title: 'Introduction to Computer Science',
        description: 'A basic course on computer science',
        credits: 3,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /courses', () => {
    it('returns a list of courses', async () => {
      const { status, body } = await request(app.getHttpServer()).get('/courses');
      expect(status).toBe(200);
      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 99999,
            code: 'CS101',
            title: 'Introduction to Computer Science',
            description: 'A basic course on computer science',
            credits: 3,
          }),
        ]),
      );
    });
  });

  describe('GET /courses/:id', () => {
    it('returns a course', async () => {
      const { status, body } = await request(app.getHttpServer()).get(`/courses/${course.id}`);
      expect(status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          id: 99999,
          code: 'CS101',
          title: 'Introduction to Computer Science',
          description: 'A basic course on computer science',
          credits: 3,
        }),
      );
    });
  });
});
