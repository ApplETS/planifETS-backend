import { INestApplication } from '@nestjs/common';
import { Availability, Course } from '@prisma/client';
import request from 'supertest';

import { PrismaService } from '../../src/prisma/prisma.service';
import {
  buildSearchCourseContract,
  serializeCourseEntityContract,
} from '../test-utils/api-contract-builders';
import { closeE2eTestApp, createE2eTestApp } from '../test-utils/e2e-app';
import {
  seedCourse,
  seedCourseInstance,
  seedProgram,
  seedProgramCourse,
  seedProgramCoursePrerequisite,
  seedSession,
} from '../test-utils/prisma-fixtures';

describe('CourseController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createE2eTestApp());
  });

  afterEach(async () => {
    await closeE2eTestApp(app);
  });

  async function seedSearchScenario() {
    await seedSession(prisma, {
      year: 2026,
      trimester: 'AUTOMNE',
    });
    await seedSession(prisma, {
      year: 2026,
      trimester: 'ETE',
    });

    const softwareProgram = await seedProgram(prisma, {
      id: 7084,
      code: '7084',
      title: 'Baccalaureat en genie logiciel',
    });
    const constructionProgram = await seedProgram(prisma, {
      id: 1822,
      code: '1822',
      title: 'Baccalaureat en genie de la construction',
    });

    const prerequisiteCourse = await seedCourse(prisma, {
      id: 145001,
      code: 'MAT145',
      title: 'Calcul differentiel',
      description: 'Prerequisite course',
      credits: 4,
      cycle: 1,
    });
    const firstCourse = await seedCourse(prisma, {
      id: 121001,
      code: 'LOG100',
      title: 'Analyse de programmes',
      description: 'Introduction aux programmes',
    });
    const secondCourse = await seedCourse(prisma, {
      id: 121002,
      code: 'LOG121',
      title: 'Conception orientee objet',
      description: 'Cours avance de conception',
    });
    const filteredOutCourse = await seedCourse(prisma, {
      id: 121003,
      code: 'LOG240',
      title: 'Architecture logicielle',
      description: 'Cours axe architecture',
      credits: null,
      cycle: null,
    });

    await seedProgramCourse(prisma, {
      courseId: prerequisiteCourse.id,
      programId: softwareProgram.id,
      type: 'TRONC',
      typicalSessionIndex: 1,
    });
    await seedProgramCourse(prisma, {
      courseId: firstCourse.id,
      programId: softwareProgram.id,
      type: 'TRONC',
      typicalSessionIndex: 1,
    });
    await seedProgramCourse(prisma, {
      courseId: secondCourse.id,
      programId: softwareProgram.id,
      type: 'TRONC',
      typicalSessionIndex: 2,
      unstructuredPrerequisite: 'MAT145 or equivalent',
    });
    await seedProgramCourse(prisma, {
      courseId: filteredOutCourse.id,
      programId: constructionProgram.id,
      type: 'CONCE',
      typicalSessionIndex: 3,
    });

    await seedProgramCoursePrerequisite(prisma, {
      courseId: secondCourse.id,
      prerequisiteId: prerequisiteCourse.id,
      programId: softwareProgram.id,
    });

    await seedCourseInstance(prisma, {
      courseId: firstCourse.id,
      sessionYear: 2026,
      sessionTrimester: 'AUTOMNE',
      availability: [Availability.JOUR],
    });
    await seedCourseInstance(prisma, {
      courseId: filteredOutCourse.id,
      sessionYear: 2026,
      sessionTrimester: 'ETE',
      availability: [Availability.SOIR],
    });

    return {
      firstCourse,
      secondCourse,
    };
  }

  describe('GET /courses', () => {
    it('returns a list of courses', async () => {
      const course = await seedCourse(prisma, {
        id: 99999,
        code: 'CS101',
        title: 'Introduction to Computer Science',
        description: 'A basic course on computer science',
        credits: 3,
        cycle: 1,
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
        updatedAt: new Date('2026-01-16T00:00:00.000Z'),
      });

      const { status, body } = await request(app.getHttpServer()).get('/courses');

      expect(status).toBe(200);
      expect(body).toStrictEqual([
        serializeCourseEntityContract(course),
      ]);
    });
  });

  describe('GET /courses/:id', () => {
    it('returns a course', async () => {
      const course: Course = await seedCourse(prisma, {
        id: 99999,
        code: 'CS101',
        title: 'Introduction to Computer Science',
        description: 'A basic course on computer science',
        credits: 3,
        cycle: 1,
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
        updatedAt: new Date('2026-01-16T00:00:00.000Z'),
      });

      const { status, body } = await request(app.getHttpServer()).get(
        `/courses/${course.id}`,
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual(serializeCourseEntityContract(course));
    });
  });

  describe('GET /courses/search', () => {
    it('returns ordered paginated search results without program-specific metadata', async () => {
      const { secondCourse } = await seedSearchScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/courses/search')
        .query({
          query: 'LOG',
          limit: '1',
          offset: '1',
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        courses: [
          buildSearchCourseContract({
            id: secondCourse.id,
            code: 'LOG121',
            title: 'Conception orientee objet',
            credits: 3,
            cycle: 1,
            sessionAvailability: [],
            prerequisites: [{
              id: 145001,
              code: 'MAT145',
              title: 'Calcul differentiel',
              credits: 4,
              cycle: 1,
            }],
          }),
        ],
        total: 3,
        hasMore: true,
      });
    });

    it('filters by programCodes and returns program-specific fields', async () => {
      const { firstCourse, secondCourse } = await seedSearchScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/courses/search')
        .query({
          query: 'LOG',
          programCodes: '7084',
          limit: '10',
          offset: '0',
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        courses: [
          buildSearchCourseContract({
            id: firstCourse.id,
            code: 'LOG100',
            title: 'Analyse de programmes',
            credits: 3,
            cycle: 1,
            sessionAvailability: [
              {
                sessionCode: 'A2026',
                availability: ['JOUR'],
              },
            ],
            prerequisites: [],
            typicalSessionIndex: 1,
            type: 'TRONC',
            unstructuredPrerequisite: null,
          }),
          buildSearchCourseContract({
            id: secondCourse.id,
            code: 'LOG121',
            title: 'Conception orientee objet',
            credits: 3,
            cycle: 1,
            sessionAvailability: [],
            prerequisites: [{
              id: 145001,
              code: 'MAT145',
              title: 'Calcul differentiel',
              credits: 4,
              cycle: 1,
            }],
            typicalSessionIndex: 2,
            type: 'TRONC',
            unstructuredPrerequisite: 'MAT145 or equivalent',
          }),
        ],
        total: 2,
        hasMore: false,
      });
    });

    it('falls back to an unfiltered contract when all provided programCodes are invalid', async () => {
      await seedSearchScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/courses/search')
        .query({
          query: 'LOG',
          programCodes: '9999',
          limit: '1',
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        courses: [
          buildSearchCourseContract({
            id: 121001,
            code: 'LOG100',
            title: 'Analyse de programmes',
            credits: 3,
            cycle: 1,
            sessionAvailability: [
              {
                sessionCode: 'A2026',
                availability: ['JOUR'],
              },
            ],
            prerequisites: [],
          }),
        ],
        total: 3,
        hasMore: true,
      });
    });

    it('returns an empty paginated payload when no course matches the query', async () => {
      await seedSearchScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/courses/search')
        .query({ query: 'ZZZ' });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        courses: [],
        total: 0,
        hasMore: false,
      });
    });
  });

  describe('GET /courses/codes', () => {
    it('returns exact serialized course payloads for semicolon-delimited codes and ignores blanks', async () => {
      const course = await seedCourse(prisma, {
        id: 120001,
        code: 'LOG100',
        title: 'Analyse de programmes',
        description: 'Introduction aux programmes',
        credits: 3,
        cycle: 1,
        createdAt: new Date('2026-02-10T00:00:00.000Z'),
        updatedAt: new Date('2026-02-11T00:00:00.000Z'),
      });

      const { status, body } = await request(app.getHttpServer())
        .get('/courses/codes')
        .query({ codes: 'LOG100;;MISSING' });

      expect(status).toBe(200);
      expect(body).toStrictEqual([serializeCourseEntityContract(course)]);
    });

    it('accepts repeated codes query params and ignores blank entries', async () => {
      const course = await seedCourse(prisma, {
        id: 120002,
        code: 'LOG121',
        title: 'Conception orientee objet',
        description: 'Cours avance de conception',
        credits: 3,
        cycle: 1,
        createdAt: new Date('2026-02-12T00:00:00.000Z'),
        updatedAt: new Date('2026-02-13T00:00:00.000Z'),
      });

      const { status, body } = await request(app.getHttpServer())
        .get('/courses/codes')
        .query({ codes: ['LOG121', '', 'MISSING'] });

      expect(status).toBe(200);
      expect(body).toStrictEqual([serializeCourseEntityContract(course)]);
    });

    it('returns an empty array when the codes query param is missing', async () => {
      const { status, body } = await request(app.getHttpServer()).get(
        '/courses/codes',
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual([]);
    });
  });
});
