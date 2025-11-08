import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Course, Session } from '@prisma/client';
import { useContainer } from 'class-validator';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseService (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let course: Course;
  let session: Session;

  const courseShape = expect.objectContaining({
    id: expect.any(Number),
    programId: expect.any(Number),
    code: expect.any(String),
    title: expect.any(String),
    description: expect.any(String),
    credits: expect.any(Number),
  });

  beforeAll(async () => {
    void session; // To avoid unused variable error

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();

    session = await prisma.session.create({
      data: {
        trimester: 'AUTOMNE',
        year: 2021,
      },
    });

    course = await prisma.course.create({
      data: {
        id: 1,
        code: 'CS101',
        title: 'Introduction to Computer Science',
        description: 'A basic course on computer science',
        credits: 3,
      },
    });
  });

  afterAll(async () => {
    await prisma.course.deleteMany();
    await prisma.session.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /courses', () => {
    it('returns a list of courses', async () => {
      const { status, body } = await request(app.getHttpServer()).get(
        '/courses',
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual(expect.arrayContaining([courseShape]));
    });
  });

  describe('GET /courses/:id', () => {
    it('returns a course', async () => {
      const { status, body } = await request(app.getHttpServer()).get(
        `/courses/${course.id}`,
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual(courseShape);
    });
  });
});
