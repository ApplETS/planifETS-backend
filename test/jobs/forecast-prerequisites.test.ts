import { Logger } from '@nestjs/common';
import {
  Prisma,
  ProgramCourse,
  ProgramCoursePrerequisite
} from '@prisma/client';

import { CourseCodeValidationPipe } from '../../src/common/pipes/models/course/course-code-validation-pipe';
import { HoraireCoursService } from '../../src/common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { PlanificationCoursService } from '../../src/common/website-helper/pdf/pdf-parser/planification/planification-cours.service';
import { ICoursePlanification } from '../../src/common/website-helper/pdf/pdf-parser/planification/planification-cours.types';
import { CourseService } from '../../src/course/course.service';
import { CourseInstanceService } from '../../src/course-instance/course-instance.service';
import { CourseInstancesJobService } from '../../src/jobs/workers/course-instances.worker';
import { SessionsJobService } from '../../src/jobs/workers/sessions.worker';
import { PrerequisiteService } from '../../src/prerequisite/prerequisite.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as programFlags from '../../src/prisma/seeds/data/programs-to-seed.json';
import { ProgramService } from '../../src/program/program.service';
import { ProgramCourseService } from '../../src/program-course/program-course.service';
import { SessionService } from '../../src/session/session.service';

// Keep seeding, PDF downloads and database I/O outside these regressions.
jest.mock('../../src/prisma/programs.seeder', () => ({
  seedProgramPlanificationPdfParserFlags: jest.fn(),
  seedProgramHorairePdfParserFlags: jest.fn()
}));

describe('Forecast program links and current-session prerequisites', () => {
  const date = new Date('2026-10-02T12:00:00Z');
  const programs = [
    { id: 10, code: '7086' },
    { id: 20, code: '7084' }
  ];
  const coreCourses = [
    { id: 1, code: 'LOG200' },
    { id: 2, code: 'MAT210' },
    { id: 3, code: 'LOG121' }
  ];
  let courses: typeof coreCourses;
  const session = {
    year: 2026,
    trimester: 'AUTOMNE',
    createdAt: date,
    updatedAt: date
  };
  let links: ProgramCourse[];
  let prerequisites: ProgramCoursePrerequisite[];
  let forecast: CourseInstancesJobService;
  let sessions: SessionsJobService;
  let parseForecast: jest.Mock;
  let parseHoraire: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let createLink: jest.Mock;
  let createPrerequisite: jest.Mock;
  let deleteLinks: jest.Mock;
  let deleteEdges: jest.Mock;
  let transaction: jest.Mock;
  let instances: {
    getAllCourseInstances: jest.Mock;
    createCourseInstance: jest.Mock;
    updateCourseInstanceAvailability: jest.Mock;
    deleteCourseInstance: jest.Mock;
  };

  beforeEach(() => {
    courses = [...coreCourses];
    links = [];
    prerequisites = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    // A small stateful Prisma boundary lets the real link/prerequisite services
    // enforce their existence checks; no program links are pre-seeded by default.
    const findLink = (where: { courseId: number; programId: number }) =>
      links.find(
        (link) =>
          link.courseId === where.courseId && link.programId === where.programId
      );
    createLink = jest.fn(({ data }) => {
      const link: ProgramCourse = {
        courseId: data.course.connect.id,
        programId: data.program.connect.id,
        type: data.type ?? null,
        typicalSessionIndex: data.typicalSessionIndex ?? null,
        unstructuredPrerequisite: data.unstructuredPrerequisite ?? null,
        createdAt: date,
        updatedAt: date
      };
      links.push(link);
      return link;
    });
    createPrerequisite = jest.fn(({ data }) => {
      const target = data.programCourse.connect.courseId_programId;
      const required = data.prerequisite.connect.courseId_programId;
      // Model the FK constraint rather than allowing fabricated membership.
      if (!findLink(target) || !findLink(required))
        throw new Error('Missing program link');
      const prerequisite = {
        ...target,
        prerequisiteId: required.courseId,
        createdAt: date,
        updatedAt: date
      };
      prerequisites.push(prerequisite);
      return prerequisite;
    });
    deleteEdges = jest.fn(({ where }) => {
      const removedIds: number[] = where.OR[0].courseId.in;
      const before = prerequisites.length;
      prerequisites = prerequisites.filter(
        (p) =>
          p.programId !== where.programId ||
          (!removedIds.includes(p.courseId) &&
            !removedIds.includes(p.prerequisiteId))
      );
      return { count: before - prerequisites.length };
    });
    deleteLinks = jest.fn(({ where }) => {
      const before = links.length;
      links = links.filter(
        (link) =>
          link.programId !== where.programId ||
          !where.courseId.in.includes(link.courseId)
      );
      return { count: before - links.length };
    });
    transaction = jest.fn(
      async (callback: (tx: Prisma.TransactionClient) => Promise<number>) => {
        const savedLinks = [...links];
        const savedPrerequisites = [...prerequisites];
        try {
          return await callback(prisma);
        } catch (error) {
          links = savedLinks;
          prerequisites = savedPrerequisites;
          throw error;
        }
      }
    );
    const prisma = {
      $transaction: transaction,
      programCourse: {
        findMany: jest.fn(({ where }) =>
          links.filter((link) => link.programId === where.programId)
        ),
        findFirst: jest.fn(({ where }) => findLink(where) ?? null),
        findUnique: jest.fn(({ where }) => {
          const link = findLink(where.courseId_programId);
          return link
            ? {
                ...link,
                prerequisites: prerequisites
                  .filter(
                    (p) =>
                      p.courseId === link.courseId &&
                      p.programId === link.programId
                  )
                  .map((p) => ({
                    ...p,
                    prerequisite: {
                      course: courses.find((c) => c.id === p.prerequisiteId)
                    }
                  }))
              }
            : null;
        }),
        create: createLink,
        deleteMany: deleteLinks,
        update: jest.fn(({ where, data }) => {
          const link = findLink(where.courseId_programId);
          return Object.assign(link!, data);
        })
      },
      programCoursePrerequisite: {
        findUnique: jest.fn(({ where }) => {
          const key = where.courseId_programId_prerequisiteId;
          return (
            prerequisites.find(
              (p) =>
                p.courseId === key.courseId &&
                p.programId === key.programId &&
                p.prerequisiteId === key.prerequisiteId
            ) ?? null
          );
        }),
        create: createPrerequisite,
        delete: jest.fn(),
        deleteMany: deleteEdges
      }
    } as unknown as PrismaService;
    const courseService = {
      getCoursesByCodes: jest.fn((codes: string[]) =>
        courses.filter((c) => codes.includes(c.code))
      ),
      getCourseByCode: jest.fn(
        (code: string) => courses.find((c) => c.code === code) ?? null
      )
    } as unknown as CourseService;
    const programService = {
      getProgramsByPlanificationParsablePDF: jest
        .fn()
        .mockResolvedValue(programs),
      getProgramsByHoraireParsablePDF: jest
        .fn()
        .mockResolvedValue([programs[0]])
    } as unknown as ProgramService;
    const sessionService = {
      getOrCreateCurrentSession: jest.fn().mockResolvedValue(session),
      getOrCreateSessionFromCode: jest.fn().mockResolvedValue(session)
    } as unknown as SessionService;
    instances = {
      getAllCourseInstances: jest.fn().mockResolvedValue([]),
      createCourseInstance: jest.fn(),
      updateCourseInstanceAvailability: jest.fn(),
      deleteCourseInstance: jest.fn()
    };
    parseForecast = jest.fn(
      (code: string): Promise<ICoursePlanification[]> =>
        Promise.resolve<ICoursePlanification[]>(
          code === '7086'
            ? [
                { code: 'LOG200', available: { A26: 'J' } },
                { code: 'MAT210', available: {} },
                { code: 'LOG121', available: {} },
                { code: 'LOG200', available: {} },
                { code: 'LOG999', available: {} }
              ]
            : [{ code: 'LOG200', available: {} }]
        )
    );
    parseHoraire = jest.fn().mockResolvedValue([
      {
        code: 'LOG200',
        title: 'STRUCTURE DE DONNÉES ET ALGORITHMES',
        prerequisites: 'MAT210, LOG121'
      }
    ]);
    const programCourseService = new ProgramCourseService(prisma);
    const prerequisiteService = new PrerequisiteService(
      prisma,
      programCourseService,
      courseService
    );
    forecast = new CourseInstancesJobService(
      {
        parseProgramPlanification: parseForecast
      } as unknown as PlanificationCoursService,
      programService,
      courseService,
      instances as unknown as CourseInstanceService,
      sessionService,
      programCourseService
    );
    sessions = new SessionsJobService(
      sessionService,
      programService,
      { parsePdfFromUrl: parseHoraire } as unknown as HoraireCoursService,
      courseService,
      programCourseService,
      prerequisiteService,
      new CourseCodeValidationPipe()
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('includes 7086 in forecast parser flags', () => {
    expect(programFlags.planificationPdfPrograms).toContain('7086');
  });

  it('links all listed existing courses, deduplicates per program, and preserves availability sync', async () => {
    await forecast.processCourseInstances();

    expect(
      links.map(({ courseId, programId }) => ({ courseId, programId }))
    ).toEqual([
      { courseId: 1, programId: 10 },
      { courseId: 2, programId: 10 },
      { courseId: 3, programId: 10 },
      { courseId: 1, programId: 20 }
    ]);
    expect(createLink).toHaveBeenCalledTimes(4);
    expect(
      links.every(
        (link) => link.type === null && link.typicalSessionIndex === null
      )
    ).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('LOG999 from forecast PDF for program 7086')
    );
    expect(parseForecast).toHaveBeenCalledTimes(2);
    expect(instances.createCourseInstance).toHaveBeenCalledWith(
      courses[0],
      session,
      ['JOUR']
    );
    expect(createLink.mock.invocationCallOrder[3]).toBeLessThan(
      instances.createCourseInstance.mock.invocationCallOrder[0]
    );
  });

  it('does not duplicate links, overwrite metadata/prerequisites, or prune a small forecast', async () => {
    await forecast.processCourseInstances();
    links[0].type = 'TRONC';
    links[0].typicalSessionIndex = 3;
    links[0].unstructuredPrerequisite = 'MAT210, LOG121';
    prerequisites.push({
      courseId: 1,
      programId: 10,
      prerequisiteId: 2,
      createdAt: date,
      updatedAt: date
    });
    links.push({ ...links[0], courseId: 99 });
    const before = links.map((link) => ({ ...link }));
    const prerequisitesBefore = [...prerequisites];

    await forecast.processCourseInstances();

    expect(links).toEqual(before);
    expect(prerequisites).toEqual(prerequisitesBefore);
    expect(createLink).toHaveBeenCalledTimes(4);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('supplies the missing links so LOG200 saves exactly MAT210 and LOG121, idempotently', async () => {
    expect(links).toHaveLength(0);
    await forecast.processCourseInstances();
    await sessions.processSessions();

    expect(parseHoraire).toHaveBeenCalledWith(
      'https://horaire.etsmtl.ca/HorairePublication/HorairePublication_20263_7086.pdf'
    );
    expect(
      prerequisites.map(({ courseId, programId, prerequisiteId }) => ({
        courseId,
        programId,
        prerequisiteId
      }))
    ).toEqual([
      { courseId: 1, programId: 10, prerequisiteId: 2 },
      { courseId: 1, programId: 10, prerequisiteId: 3 }
    ]);
    expect(links[0].unstructuredPrerequisite).toBe('MAT210, LOG121');

    await forecast.processCourseInstances();
    await sessions.processSessions();

    expect(prerequisites).toHaveLength(2);
    expect(createPrerequisite).toHaveBeenCalledTimes(2);
  });

  it('reports a prerequisite absent from the forecast without fabricating membership', async () => {
    parseForecast.mockResolvedValue([{ code: 'LOG200', available: {} }]);
    const errorSpy = jest.spyOn(Logger.prototype, 'error');
    await forecast.processCourseInstances();
    await sessions.processSessions();

    expect(prerequisites).toHaveLength(0);
    expect(links.filter((link) => link.programId === 10)).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'ProgramCourse not found for prerequisite course MAT210 and program 7086'
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'ProgramCourse not found for prerequisite course LOG121 and program 7086'
    );
  });

  describe('Destructive membership synchronization', () => {
    function largeForecast(): ICoursePlanification[] {
      const extraCourses = Array.from({ length: 18 }, (_, index) => ({
        id: index + 4,
        code: `LOG${index + 300}`
      }));
      courses.push(...extraCourses);
      return courses.map((course) => ({ code: course.code, available: {} }));
    }

    function addOldLink(programId = 10): void {
      if (!courses.some((course) => course.id === 99)) {
        courses.push({ id: 99, code: 'LOG998' });
      }
      links.push({
        courseId: 99,
        programId,
        type: 'TRONC',
        typicalSessionIndex: 3,
        unstructuredPrerequisite: 'LOG200',
        createdAt: date,
        updatedAt: date
      });
    }

    function setForecast(rows: ICoursePlanification[]): void {
      parseForecast.mockImplementation(async (code: string) =>
        code === '7086' ? rows : [{ code: 'LOG200', available: {} }]
      );
    }

    it('prunes absent links above 20 distinct courses, not unavailable courses, and is idempotent', async () => {
      const rows = largeForecast();
      setForecast(rows);
      addOldLink();
      addOldLink(20);
      await forecast.processCourseInstances();

      expect(links.filter((link) => link.programId === 10)).toHaveLength(21);
      expect(
        links.some((link) => link.courseId === 99 && link.programId === 10)
      ).toBe(false);
      expect(
        links.some((link) => link.courseId === 99 && link.programId === 20)
      ).toBe(true);
      expect(
        links.some((link) => link.courseId === 2 && link.programId === 10)
      ).toBe(true);
      expect(deleteLinks).toHaveBeenCalledWith({
        where: { programId: 10, courseId: { in: [99] } }
      });
      const afterFirstRun = [...links];

      await forecast.processCourseInstances();

      expect(links).toEqual(afterFirstRun);
      expect(deleteLinks).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Skipping program-course pruning for program 7084'
        )
      );
    });

    it.each([0, 1, 19, 20])(
      'does not prune when there are %i distinct listed courses',
      async (count) => {
        setForecast(largeForecast().slice(0, count));
        addOldLink();
        await forecast.processCourseInstances();

        expect(
          links.some((link) => link.courseId === 99 && link.programId === 10)
        ).toBe(true);
        expect(transaction).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Skipping program-course pruning for program 7086'
          )
        );
      }
    );

    it('does not let duplicate rows inflate the threshold', async () => {
      const rows = largeForecast().slice(0, 20);
      setForecast([...rows, ...rows]);
      addOldLink();
      await forecast.processCourseInstances();

      expect(transaction).not.toHaveBeenCalled();
      expect(
        links.some((link) => link.courseId === 99 && link.programId === 10)
      ).toBe(true);
    });

    it.each(['invalid row', 'missing catalog course'])(
      'does not prune a large forecast with a %s',
      async (problem) => {
        const rows = largeForecast();
        rows.push({
          code: problem === 'invalid row' ? 'NOT-A-COURSE' : 'LOG999',
          available: {}
        });
        setForecast(rows);
        addOldLink();
        await forecast.processCourseInstances();

        expect(transaction).not.toHaveBeenCalled();
        expect(
          links.some((link) => link.courseId === 99 && link.programId === 10)
        ).toBe(true);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Skipping program-course pruning for program 7086'
          )
        );
      }
    );

    it.each(['HTTP 404', 'malformed PDF'])(
      'does not prune on a download/parser failure: %s',
      async (message) => {
        parseForecast.mockImplementation(async (code: string) => {
          if (code === '7086') throw new Error(message);
          return [{ code: 'LOG200', available: {} }];
        });
        addOldLink();
        await forecast.processCourseInstances();

        expect(transaction).not.toHaveBeenCalled();
        expect(
          links.some((link) => link.courseId === 99 && link.programId === 10)
        ).toBe(true);
        expect(parseForecast).toHaveBeenCalledWith('7084');
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Error parsing planification PDF for program 7086'
          ),
          expect.any(Error)
        );
      }
    );

    it('removes both incoming and outgoing prerequisite edges only in the affected program', async () => {
      setForecast(largeForecast());
      addOldLink();
      addOldLink(20);
      const edge = (
        courseId: number,
        prerequisiteId: number,
        programId = 10
      ): ProgramCoursePrerequisite => ({
        courseId,
        prerequisiteId,
        programId,
        createdAt: date,
        updatedAt: date
      });
      const retainedEdge = edge(1, 2);
      const otherProgramEdge = edge(1, 99, 20);
      prerequisites.push(
        edge(99, 1),
        edge(1, 99),
        retainedEdge,
        otherProgramEdge
      );
      await forecast.processCourseInstances();

      expect(prerequisites).toEqual([retainedEdge, otherProgramEdge]);
      expect(deleteEdges).toHaveBeenCalledWith({
        where: {
          programId: 10,
          OR: [{ courseId: { in: [99] } }, { prerequisiteId: { in: [99] } }]
        }
      });
      expect(deleteEdges.mock.invocationCallOrder[0]).toBeLessThan(
        deleteLinks.mock.invocationCallOrder[0]
      );
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(courses).toHaveLength(22);
      expect(courses).toContainEqual({ id: 99, code: 'LOG998' });
    });

    it('preserves metadata and prerequisites on retained links during pruning', async () => {
      setForecast(largeForecast());
      await forecast.processCourseInstances();
      const retained = links.find(
        (link) => link.courseId === 1 && link.programId === 10
      )!;
      Object.assign(retained, {
        type: 'TRONC',
        typicalSessionIndex: 3,
        unstructuredPrerequisite: 'MAT210, LOG121'
      });
      const before = { ...retained };
      prerequisites.push({
        courseId: 1,
        prerequisiteId: 2,
        programId: 10,
        createdAt: date,
        updatedAt: date
      });
      const edgesBefore = [...prerequisites];
      addOldLink();

      await forecast.processCourseInstances();

      expect(
        links.find((link) => link.courseId === 1 && link.programId === 10)
      ).toEqual(before);
      expect(prerequisites).toEqual(edgesBefore);
    });

    it('rolls back prerequisite deletion if link deletion fails and logs the error', async () => {
      setForecast(largeForecast());
      addOldLink();
      prerequisites.push({
        courseId: 99,
        prerequisiteId: 1,
        programId: 10,
        createdAt: date,
        updatedAt: date
      });
      const edgesBefore = [...prerequisites];
      deleteLinks.mockRejectedValueOnce(new Error('link deletion failed'));

      await forecast.processCourseInstances();

      expect(prerequisites).toEqual(edgesBefore);
      expect(
        links.some((link) => link.courseId === 99 && link.programId === 10)
      ).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error parsing planification PDF for program 7086'
        ),
        expect.objectContaining({ message: 'link deletion failed' })
      );
    });

    it('never deletes links when prerequisite cleanup fails', async () => {
      setForecast(largeForecast());
      addOldLink();
      prerequisites.push({
        courseId: 99,
        prerequisiteId: 1,
        programId: 10,
        createdAt: date,
        updatedAt: date
      });
      const edgesBefore = [...prerequisites];
      deleteEdges.mockRejectedValueOnce(
        new Error('prerequisite deletion failed')
      );

      await forecast.processCourseInstances();

      expect(deleteLinks).not.toHaveBeenCalled();
      expect(prerequisites).toEqual(edgesBefore);
      expect(
        links.some((link) => link.courseId === 99 && link.programId === 10)
      ).toBe(true);
    });

    it('waits for the next valid forecast after a suspiciously small PDF', async () => {
      const rows = largeForecast();
      addOldLink();
      setForecast(rows.slice(0, 20));
      await forecast.processCourseInstances();
      expect(transaction).not.toHaveBeenCalled();

      setForecast(rows);
      await forecast.processCourseInstances();

      expect(
        links.some((link) => link.courseId === 99 && link.programId === 10)
      ).toBe(false);
      expect(deleteLinks).toHaveBeenCalledTimes(1);
    });
  });
});
