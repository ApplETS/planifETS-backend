import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/prisma/prisma.service';
import { closeE2eTestApp, createE2eTestApp } from '../test-utils/e2e-app';
import {
  seedCourse,
  seedProgram,
  seedProgramCourse,
} from '../test-utils/prisma-fixtures';

describe('Stage courses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createE2eTestApp());
  });

  afterEach(async () => {
    await closeE2eTestApp(app);
  });

  async function seedStageScenario() {
    const program = await seedProgram(prisma, {
      id: 88801,
      title: 'Baccalaureat en genie logiciel (co-op)',
    });

    const stg1 = await seedCourse(prisma, {
      id: 9000001,
      code: 'STG001',
      title: 'Stage I',
      credits: 9,
      cycle: 1,
    });
    const stg2 = await seedCourse(prisma, {
      id: 9000002,
      code: 'STG002',
      title: 'Stage II',
      credits: 9,
      cycle: 1,
    });
    const stg3 = await seedCourse(prisma, {
      id: 9000003,
      code: 'STG003',
      title: 'Stage III',
      credits: 9,
      cycle: 1,
    });

    await seedProgramCourse(prisma, { courseId: stg1.id, programId: program.id, type: 'STAGE' });
    await seedProgramCourse(prisma, { courseId: stg2.id, programId: program.id, type: 'STAGE' });
    await seedProgramCourse(prisma, { courseId: stg3.id, programId: program.id, type: 'STAGE' });

    return { program, stg1, stg2, stg3 };
  }

  describe('GET /courses/search', () => {
    it('returns STG001–STG003 with type STAGE when filtering by a co-op program', async () => {
      await seedStageScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/courses/search')
        .query({ query: 'STG', programCodes: '88801' });

      expect(status).toBe(200);
      expect(body.courses).toHaveLength(3);
      expect(body.courses.map((c: { code: string }) => c.code)).toEqual(
        expect.arrayContaining(['STG001', 'STG002', 'STG003']),
      );
      body.courses.forEach((c: { type: string; credits: number }) => {
        expect(c.type).toBe('STAGE');
        expect(c.credits).toBe(9);
      });
    });
  });

  describe('ProgramCourse links', () => {
    it('STG001 is linked to the cycle-1 program with type STAGE', async () => {
      await seedStageScenario();

      const links = await prisma.programCourse.findMany({
        where: { course: { code: 'STG001' }, program: { cycle: 1 } },
      });

      expect(links.length).toBeGreaterThan(0);
      expect(links[0].type).toBe('STAGE');
    });
  });
});
