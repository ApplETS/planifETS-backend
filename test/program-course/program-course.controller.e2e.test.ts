import { INestApplication } from '@nestjs/common';
import { Availability } from '@prisma/client';
import request from 'supertest';

import { PrismaService } from '../../src/prisma/prisma.service';
import { buildSearchCourseContract } from '../test-utils/api-contract-builders';
import { closeE2eTestApp, createE2eTestApp } from '../test-utils/e2e-app';
import {
  seedCourse,
  seedCourseInstance,
  seedProgram,
  seedProgramCourse,
  seedProgramCoursePrerequisite,
  seedSession,
} from '../test-utils/prisma-fixtures';

function buildProgramGroup(
  courses: ReturnType<typeof buildSearchCourseContract>[],
) {
  return {
    programCode: '7084',
    programTitle: 'Baccalaureat en genie logiciel',
    courses,
  };
}

function buildPrerequisiteCourseContract() {
  return buildSearchCourseContract({
    id: 145001,
    code: 'MAT145',
    title: 'Calcul differentiel',
    credits: 4,
    cycle: 1,
    sessionAvailability: [],
    prerequisites: [],
    typicalSessionIndex: 1,
    type: 'TRONC',
    unstructuredPrerequisite: null,
  });
}

function buildTargetCourseContract(courseId = 121002) {
  return buildSearchCourseContract({
    id: courseId,
    code: 'LOG121',
    title: 'Conception orientee objet',
    credits: 3,
    cycle: 1,
    sessionAvailability: [
      {
        sessionCode: 'A2026',
        availability: ['JOUR'],
      },
    ],
    prerequisites: [
      {
        id: 145001,
        code: 'MAT145',
        title: 'Calcul differentiel',
        credits: 4,
        cycle: 1,
      },
    ],
    typicalSessionIndex: 2,
    type: 'TRONC',
    unstructuredPrerequisite: 'MAT145 or equivalent',
  });
}

function buildEmptyNestedCourseContract(courseId = 121210) {
  return buildSearchCourseContract({
    id: courseId,
    code: 'LOG210',
    title: 'Analyse des systemes',
    credits: 3,
    cycle: 1,
    sessionAvailability: [],
    prerequisites: [],
    typicalSessionIndex: 3,
    type: 'CONCE',
    unstructuredPrerequisite: null,
  });
}

describe('ProgramCourseController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createE2eTestApp());
  });

  afterEach(async () => {
    await closeE2eTestApp(app);
  });

  async function seedProgramCourseScenario() {
    await seedSession(prisma, {
      year: 2026,
      trimester: 'AUTOMNE',
    });

    const program = await seedProgram(prisma, {
      id: 7084,
      code: '7084',
      title: 'Baccalaureat en genie logiciel',
    });

    const prerequisiteCourse = await seedCourse(prisma, {
      id: 145001,
      code: 'MAT145',
      title: 'Calcul differentiel',
      description: 'Calcul differentiel I',
      credits: 4,
      cycle: 1,
    });
    const targetCourse = await seedCourse(prisma, {
      id: 121002,
      code: 'LOG121',
      title: 'Conception orientee objet',
      description: 'Cours avance de conception',
      credits: 3,
      cycle: 1,
    });
    const emptyNestedCourse = await seedCourse(prisma, {
      id: 121210,
      code: 'LOG210',
      title: 'Analyse des systemes',
      description: 'Cours sans prerequis',
      credits: 3,
      cycle: 1,
    });

    await seedProgramCourse(prisma, {
      courseId: prerequisiteCourse.id,
      programId: program.id,
      type: 'TRONC',
      typicalSessionIndex: 1,
    });
    await seedProgramCourse(prisma, {
      courseId: targetCourse.id,
      programId: program.id,
      type: 'TRONC',
      typicalSessionIndex: 2,
      unstructuredPrerequisite: 'MAT145 or equivalent',
    });
    await seedProgramCourse(prisma, {
      courseId: emptyNestedCourse.id,
      programId: program.id,
      type: 'CONCE',
      typicalSessionIndex: 3,
    });

    await seedProgramCoursePrerequisite(prisma, {
      courseId: targetCourse.id,
      prerequisiteId: prerequisiteCourse.id,
      programId: program.id,
    });

    await seedCourseInstance(prisma, {
      courseId: targetCourse.id,
      sessionYear: 2026,
      sessionTrimester: 'AUTOMNE',
      availability: [Availability.JOUR],
    });

    return {
      program,
      targetCourse,
      emptyNestedCourse,
    };
  }

  describe('GET /program-courses/ids', () => {
    it('returns grouped program courses and invalid course ids', async () => {
      const { targetCourse } = await seedProgramCourseScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/program-courses/ids')
        .query({
          courseIds: [targetCourse.id, 999999],
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        data: [
          buildProgramGroup([buildTargetCourseContract(targetCourse.id)]),
        ],
        errors: {
          invalidCourseIds: [999999],
        },
      });
    });

    it('returns an empty grouped payload when all requested course ids are invalid', async () => {
      await seedProgramCourseScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/program-courses/ids')
        .query({ courseIds: '999999' });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        data: [],
        errors: {
          invalidCourseIds: [999999],
        },
      });
    });
  });

  describe('GET /program-courses/programs', () => {
    it('accepts repeated programIds params and returns data plus invalid ids', async () => {
      const { program } = await seedProgramCourseScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/program-courses/programs')
        .query({ programIds: [String(program.id), '999999'] });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        data: [
          buildProgramGroup([
            buildPrerequisiteCourseContract(),
            buildTargetCourseContract(),
            buildEmptyNestedCourseContract(),
          ]),
        ],
        errors: {
          invalidProgramIds: [999999],
        },
      });
    });

    it('returns grouped program courses ordered by typical session index', async () => {
      const { program } = await seedProgramCourseScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/program-courses/programs')
        .query({ programIds: String(program.id) });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        data: [
          buildProgramGroup([
            buildPrerequisiteCourseContract(),
            buildTargetCourseContract(),
            buildEmptyNestedCourseContract(),
          ]),
        ],
      });
    });
  });

  describe('GET /program-courses/details', () => {
    it('returns the nested program course details contract', async () => {
      const { program, targetCourse } = await seedProgramCourseScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/program-courses/details')
        .query({
          courseId: String(targetCourse.id),
          programId: String(program.id),
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        courseId: targetCourse.id,
        programId: program.id,
        type: 'TRONC',
        typicalSessionIndex: 2,
        unstructuredPrerequisite: 'MAT145 or equivalent',
        course: {
          code: 'LOG121',
          title: 'Conception orientee objet',
          credits: 3,
          description: 'Cours avance de conception',
          cycle: 1,
          courseInstances: [
            {
              availability: ['JOUR'],
              sessionYear: 2026,
              sessionTrimester: 'AUTOMNE',
              session: {
                trimester: 'AUTOMNE',
                year: 2026,
              },
            },
          ],
        },
        prerequisites: [
          {
            prerequisite: {
              course: {
                id: 145001,
                code: 'MAT145',
                title: 'Calcul differentiel',
              },
            },
          },
        ],
      });
    });

    it('keeps nested arrays in place when prerequisites and course instances are empty', async () => {
      const { program, emptyNestedCourse } = await seedProgramCourseScenario();

      const { status, body } = await request(app.getHttpServer())
        .get('/program-courses/details')
        .query({
          courseId: String(emptyNestedCourse.id),
          programId: String(program.id),
        });

      expect(status).toBe(200);
      expect(body).toStrictEqual({
        courseId: emptyNestedCourse.id,
        programId: program.id,
        type: 'CONCE',
        typicalSessionIndex: 3,
        unstructuredPrerequisite: null,
        course: {
          code: 'LOG210',
          title: 'Analyse des systemes',
          credits: 3,
          description: 'Cours sans prerequis',
          cycle: 1,
          courseInstances: [],
        },
        prerequisites: [],
      });
    });
  });
});
