import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/prisma/prisma.service';
import {
  serializeProgramContract,
} from '../test-utils/api-contract-builders';
import { closeE2eTestApp, createE2eTestApp } from '../test-utils/e2e-app';
import {
  seedCourse,
  seedProgram,
  seedProgramCourse,
} from '../test-utils/prisma-fixtures';

describe('ProgramController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createE2eTestApp());
  });

  afterEach(async () => {
    await closeE2eTestApp(app);
  });

  describe('GET /programs/:id', () => {
    it('returns a serialized program', async () => {
      const program = await seedProgram(prisma, {
        id: 7084,
        code: '7084',
        title: 'Baccalaureat en genie logiciel',
        credits: '90',
        cycle: 1,
        url: 'https://example.com/programs/7084',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-11T00:00:00.000Z'),
      });

      const { status, body } = await request(app.getHttpServer()).get(
        `/programs/${program.id}`,
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual(serializeProgramContract(program));
    });

    it('returns a validation error when the id is not numeric', async () => {
      const { status, body } = await request(app.getHttpServer()).get(
        '/programs/not-a-number',
      );

      expect(status).toBe(400);
      expect(body).toStrictEqual({
        message: ['id must be an integer number'],
        error: 'Bad Request',
        statusCode: 400,
      });
    });

    it('returns an empty 200 response when the program does not exist', async () => {
      const response = await request(app.getHttpServer()).get('/programs/999999');

      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });
  });

  describe('GET /programs', () => {
    it('returns only active programs exactly as serialized by the API', async () => {
      const activeProgram = await seedProgram(prisma, {
        id: 7084,
        code: '7084',
        title: 'Baccalaureat en genie logiciel',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        updatedAt: new Date('2026-01-11T00:00:00.000Z'),
      });
      await seedProgram(prisma, {
        id: 9999,
        code: '9999',
        title: 'Programme inactif',
        createdAt: new Date('2026-01-12T00:00:00.000Z'),
        updatedAt: new Date('2026-01-12T00:00:00.000Z'),
      });
      const course = await seedCourse(prisma, {
        id: 352405,
        code: 'LOG121',
        title: 'Conception orientee objet',
      });
      await seedProgramCourse(prisma, {
        courseId: course.id,
        programId: activeProgram.id,
      });

      const { status, body } = await request(app.getHttpServer()).get(
        '/programs',
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual([serializeProgramContract(activeProgram)]);
    });
  });

  describe('GET /programs/list/course/:courseId', () => {
    it('returns the exact custom DTO shape for programs containing the course', async () => {
      const course = await seedCourse(prisma, {
        id: 352405,
        code: 'LOG121',
        title: 'Conception orientee objet',
      });
      const program = await seedProgram(prisma, {
        id: 7084,
        code: null,
        title: 'Baccalaureat en genie logiciel',
      });
      await seedProgramCourse(prisma, {
        courseId: course.id,
        programId: program.id,
      });

      const { status, body } = await request(app.getHttpServer()).get(
        `/programs/list/course/${course.id}`,
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual([
        {
          programId: 7084,
          programCode: '',
          programTitle: 'Baccalaureat en genie logiciel',
        },
      ]);
    });

    it('returns an empty array when no program contains the course', async () => {
      const course = await seedCourse(prisma, {
        id: 352406,
        code: 'LOG240',
        title: 'Architecture logicielle',
      });

      const { status, body } = await request(app.getHttpServer()).get(
        `/programs/list/course/${course.id}`,
      );

      expect(status).toBe(200);
      expect(body).toStrictEqual([]);
    });

    it('returns a bad request when courseId is not numeric', async () => {
      const { status, body } = await request(app.getHttpServer()).get(
        '/programs/list/course/not-a-number',
      );

      expect(status).toBe(400);
      expect(body).toStrictEqual({
        statusCode: 400,
        message: 'Course ID must be a valid number',
      });
    });
  });
});
