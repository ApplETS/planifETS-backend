import { Test, TestingModule } from '@nestjs/testing';
import { Availability, Trimester } from '@prisma/client';

import { EmbeddingService } from '../../src/embedding/embedding.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  seedCourse,
  seedCourseInstance,
  seedProgram,
  seedProgramCourse,
  seedProgramCoursePrerequisite,
  seedSession,
} from '../test-utils/prisma-fixtures';

const TEST_YEAR = 2099;

describe('EmbeddingService / v_courses_for_embedding (integration)', () => {
  let service: EmbeddingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingService, PrismaService],
    }).compile();
    service = module.get<EmbeddingService>(EmbeddingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('row shape and joins', () => {
    it('returns one row with all scalar fields for a (course, program) pair', async () => {
      await seedCourse(prisma, { id: 9001, code: 'TST001', title: 'Test Course', cycle: 1 });
      await seedProgram(prisma, { id: 9001, title: 'Génie logiciel', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9001, programId: 9001, type: 'TRONC', typicalSessionIndex: 3 });

      const [row] = await service.findByCourseId(9001);

      expect(row.embedding_id).toBe('9001_9001');
      expect(row.course_id).toBe(9001);
      expect(row.program_id).toBe(9001);
      expect(row.code).toBe('TST001');
      expect(row.title).toBe('Test Course');
      expect(row.program_title).toBe('Génie logiciel');
      expect(row.type).toBe('TRONC');
      expect(row.typical_session_index).toBe(3);
      expect(row.cycle).toBe(1);
    });

    it('excludes courses not linked to any program (INNER JOIN)', async () => {
      await seedCourse(prisma, { id: 9002, code: 'TST002', title: 'Unlinked Course' });

      const rows = await service.findByCourseId(9002);

      expect(rows).toHaveLength(0);
    });

    it('emits one row per program when a course belongs to multiple programs', async () => {
      await seedCourse(prisma, { id: 9003, code: 'TST003', title: 'Multi-Program' });
      await seedProgram(prisma, { id: 9003, title: 'Program A', cycle: 1 });
      await seedProgram(prisma, { id: 9004, title: 'Program B', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9003, programId: 9003 });
      await seedProgramCourse(prisma, { courseId: 9003, programId: 9004 });

      const rows = await service.findByCourseId(9003);

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.program_id)).toEqual([9003, 9004]);
    });
  });

  describe('sessions', () => {
    it.each([
      [Trimester.AUTOMNE, 'Automne'],
      [Trimester.ETE, 'Été'],
      [Trimester.HIVER, 'Hiver'],
    ])('formats %s as "<Label> YYYY"', async (trimester, label) => {
      const id = 9010 + Object.values(Trimester).indexOf(trimester);
      await seedCourse(prisma, { id, code: `TST${id}`, title: 'Course' });
      await seedProgram(prisma, { id, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: id, programId: id });
      await seedSession(prisma, { year: TEST_YEAR, trimester });
      await seedCourseInstance(prisma, { courseId: id, sessionYear: TEST_YEAR, sessionTrimester: trimester });

      const [row] = await service.findByCourseId(id);

      expect(row.sessions).toContain(`${label} ${TEST_YEAR}`);
    });

    it('aggregates sessions from multiple CourseInstances', async () => {
      await seedCourse(prisma, { id: 9013, code: 'TST9013', title: 'Course' });
      await seedProgram(prisma, { id: 9013, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9013, programId: 9013 });
      await seedSession(prisma, { year: TEST_YEAR, trimester: Trimester.AUTOMNE });
      await seedSession(prisma, { year: TEST_YEAR, trimester: Trimester.HIVER });
      await seedCourseInstance(prisma, { courseId: 9013, sessionYear: TEST_YEAR, sessionTrimester: Trimester.AUTOMNE });
      await seedCourseInstance(prisma, { courseId: 9013, sessionYear: TEST_YEAR, sessionTrimester: Trimester.HIVER });

      const [row] = await service.findByCourseId(9013);

      expect(row.sessions).toHaveLength(2);
      expect(row.sessions).toContain(`Automne ${TEST_YEAR}`);
      expect(row.sessions).toContain(`Hiver ${TEST_YEAR}`);
    });

    it('returns an empty sessions array when the course has no CourseInstances', async () => {
      await seedCourse(prisma, { id: 9014, code: 'TST9014', title: 'Course' });
      await seedProgram(prisma, { id: 9014, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9014, programId: 9014 });

      const [row] = await service.findByCourseId(9014);

      expect(row.sessions).toEqual([]);
    });
  });

  describe('availability', () => {
    it('aggregates availability modes from a CourseInstance', async () => {
      await seedCourse(prisma, { id: 9020, code: 'TST9020', title: 'Course' });
      await seedProgram(prisma, { id: 9020, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9020, programId: 9020 });
      await seedSession(prisma, { year: TEST_YEAR, trimester: Trimester.AUTOMNE });
      await seedCourseInstance(prisma, {
        courseId: 9020,
        sessionYear: TEST_YEAR,
        sessionTrimester: Trimester.AUTOMNE,
        availability: [Availability.JOUR, Availability.SOIR],
      });

      const [row] = await service.findByCourseId(9020);

      expect(row.availability.sort()).toEqual(['JOUR', 'SOIR']);
    });

    it('deduplicates availability values across multiple CourseInstances', async () => {
      await seedCourse(prisma, { id: 9021, code: 'TST9021', title: 'Course' });
      await seedProgram(prisma, { id: 9021, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9021, programId: 9021 });
      await seedSession(prisma, { year: TEST_YEAR, trimester: Trimester.AUTOMNE });
      await seedSession(prisma, { year: TEST_YEAR, trimester: Trimester.HIVER });
      await seedCourseInstance(prisma, {
        courseId: 9021, sessionYear: TEST_YEAR, sessionTrimester: Trimester.AUTOMNE,
        availability: [Availability.JOUR],
      });
      await seedCourseInstance(prisma, {
        courseId: 9021, sessionYear: TEST_YEAR, sessionTrimester: Trimester.HIVER,
        availability: [Availability.JOUR],
      });

      const [row] = await service.findByCourseId(9021);

      expect(row.availability).toHaveLength(1);
      expect(row.availability).toContain('JOUR');
    });

    it('returns an empty availability array when the course has no CourseInstances', async () => {
      await seedCourse(prisma, { id: 9022, code: 'TST9022', title: 'Course' });
      await seedProgram(prisma, { id: 9022, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9022, programId: 9022 });

      const [row] = await service.findByCourseId(9022);

      expect(row.availability).toEqual([]);
    });
  });

  describe('prerequisite_codes', () => {
    it('returns structured prerequisite codes for the (course, program) pair', async () => {
      await seedCourse(prisma, { id: 9030, code: 'PRE9030', title: 'Prerequisite' });
      await seedCourse(prisma, { id: 9031, code: 'TST9031', title: 'Course' });
      await seedProgram(prisma, { id: 9030, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9030, programId: 9030 });
      await seedProgramCourse(prisma, { courseId: 9031, programId: 9030 });
      await seedProgramCoursePrerequisite(prisma, { courseId: 9031, prerequisiteId: 9030, programId: 9030 });

      const [row] = await service.findByCourseId(9031);

      expect(row.prerequisite_codes).toContain('PRE9030');
    });

    it('scopes prerequisite_codes to the program — same course in prog2 has none', async () => {
      await seedCourse(prisma, { id: 9040, code: 'PRE9040', title: 'Prereq' });
      await seedCourse(prisma, { id: 9041, code: 'TST9041', title: 'Course' });
      await seedProgram(prisma, { id: 9040, title: 'Program A', cycle: 1 });
      await seedProgram(prisma, { id: 9041, title: 'Program B', cycle: 1 });
      for (const programId of [9040, 9041]) {
        await seedProgramCourse(prisma, { courseId: 9040, programId });
        await seedProgramCourse(prisma, { courseId: 9041, programId });
      }
      await seedProgramCoursePrerequisite(prisma, { courseId: 9041, prerequisiteId: 9040, programId: 9040 });

      const rows = await service.findByCourseId(9041);
      const rowA = rows.find((r) => r.program_id === 9040)!;
      const rowB = rows.find((r) => r.program_id === 9041)!;

      expect(rowA.prerequisite_codes).toContain('PRE9040');
      expect(rowB.prerequisite_codes).toEqual([]);
    });

    it('returns an empty array when no structured prerequisites exist', async () => {
      await seedCourse(prisma, { id: 9050, code: 'TST9050', title: 'Course' });
      await seedProgram(prisma, { id: 9050, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9050, programId: 9050 });

      const [row] = await service.findByCourseId(9050);

      expect(row.prerequisite_codes).toEqual([]);
    });
  });

  describe('has_prerequisites', () => {
    it('is true when the course has at least one structured prerequisite', async () => {
      await seedCourse(prisma, { id: 9070, code: 'PRE9070', title: 'Prerequisite' });
      await seedCourse(prisma, { id: 9071, code: 'TST9071', title: 'Course' });
      await seedProgram(prisma, { id: 9070, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9070, programId: 9070 });
      await seedProgramCourse(prisma, { courseId: 9071, programId: 9070 });
      await seedProgramCoursePrerequisite(prisma, { courseId: 9071, prerequisiteId: 9070, programId: 9070 });

      const [row] = await service.findByCourseId(9071);

      expect(row.has_prerequisites).toBe(true);
    });

    it('is false when the course has no structured prerequisites', async () => {
      await seedCourse(prisma, { id: 9072, code: 'TST9072', title: 'Course' });
      await seedProgram(prisma, { id: 9072, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9072, programId: 9072 });

      const [row] = await service.findByCourseId(9072);

      expect(row.has_prerequisites).toBe(false);
    });
  });

  describe('unstructured_prerequisite', () => {
    it('passes free-text prerequisites through unchanged', async () => {
      await seedCourse(prisma, { id: 9060, code: 'TST9060', title: 'Course' });
      await seedProgram(prisma, { id: 9060, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, {
        courseId: 9060, programId: 9060,
        unstructuredPrerequisite: 'Autorisation du directeur',
      });

      const [row] = await service.findByCourseId(9060);

      expect(row.unstructured_prerequisite).toBe('Autorisation du directeur');
    });

    it.each([
      [9061, 'MAT210, LOG121'],
      [9062, 'LOG340, MAT350'],
    ])('nulls out "%s" (exactly two course codes)', async (id, value) => {
      await seedCourse(prisma, { id, code: `TST${id}`, title: 'Course' });
      await seedProgram(prisma, { id, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: id, programId: id, unstructuredPrerequisite: value });

      const [row] = await service.findByCourseId(id);

      expect(row.unstructured_prerequisite).toBeNull();
    });

    it('keeps a single course code (not the two-code pattern)', async () => {
      await seedCourse(prisma, { id: 9063, code: 'TST9063', title: 'Course' });
      await seedProgram(prisma, { id: 9063, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9063, programId: 9063, unstructuredPrerequisite: 'LOG121' });

      const [row] = await service.findByCourseId(9063);

      expect(row.unstructured_prerequisite).toBe('LOG121');
    });

    it('passes null through when no unstructured prerequisite is set', async () => {
      await seedCourse(prisma, { id: 9064, code: 'TST9064', title: 'Course' });
      await seedProgram(prisma, { id: 9064, title: 'Program', cycle: 1 });
      await seedProgramCourse(prisma, { courseId: 9064, programId: 9064, unstructuredPrerequisite: null });

      const [row] = await service.findByCourseId(9064);

      expect(row.unstructured_prerequisite).toBeNull();
    });
  });
});
