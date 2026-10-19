import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import {
  Prisma,
  ProgramCourse,
  ProgramCoursePrerequisite,
  Trimester
} from '@prisma/client';
import * as fs from 'fs';
import { PLANIFICATION_PDF_V2_PATH } from 'test/test-utils/constants';

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
  seedProgramHorairePdfParserFlags: jest.fn(),
  seedUmbrellaPrograms: jest.fn(),
  UQAM_PROGRAM_CODE: 'UQAM'
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
    trimester: Trimester.AUTOMNE,
    createdAt: date,
    updatedAt: date
  };
  let links: ProgramCourse[];
  let prerequisites: ProgramCoursePrerequisite[];
  let forecast: CourseInstancesJobService;
  let sessions: SessionsJobService;
  let parseForecast: jest.Mock;
  let forecastSessionCodes: string[];
  let parseHoraire: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let createLink: jest.Mock;
  let createPrerequisite: jest.Mock;
  let deleteLinks: jest.Mock;
  let deleteEdges: jest.Mock;
  let transaction: jest.Mock;
  let sessionService: SessionService;
  let programService: ProgramService;
  let instances: {
    updateCourseInstances: jest.Mock;
    getAllCourseInstances: jest.Mock;
    createCourseInstance: jest.Mock;
    updateCourseInstanceAvailability: jest.Mock;
    deleteCourseInstance: jest.Mock;
  };

  beforeEach(() => {
    forecastSessionCodes = ['A26', 'H27'];
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
    const programServiceMock = {
      getProgramByCode: jest.fn().mockResolvedValue(null),
      getProgramsByPlanificationParsablePDF: jest
        .fn()
        .mockResolvedValue(programs),
      getProgramsByHoraireParsablePDF: jest
        .fn()
        .mockResolvedValue([programs[0]])
    } as unknown as ProgramService;
    programService = programServiceMock;
    sessionService = {
      getOrCreateCurrentSession: jest.fn().mockResolvedValue(session),
      getOrCreateSessionFromCode: jest.fn().mockResolvedValue(session)
    } as unknown as SessionService;
    instances = {
      updateCourseInstances: jest.fn(),
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
        parseProgramForecast: async (code: string) => ({
          courses: await parseForecast(code),
          sessionCodes: forecastSessionCodes
        })
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
      new CourseCodeValidationPipe(),
      {} as unknown as CourseInstanceService
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('includes 7086 in forecast parser flags', () => {
    expect(programFlags.planificationPdfPrograms).toContain('7086');
  });

  it('selects the graduate umbrella forecast for parsing', () => {
    expect(programFlags.planificationPdfPrograms).toContain('CyclesSuperieurs');
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
    expect(instances.updateCourseInstances).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          offerings: expect.arrayContaining([
            { courseId: 1, availability: ['JOUR'] }
          ])
        })
      ])
    );
    expect(createLink.mock.invocationCallOrder[3]).toBeLessThan(
      instances.updateCourseInstances.mock.invocationCallOrder[0]
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

  it('imports GPE450 as day and evening in H27 from the actual forecast PDF fixture', async () => {
    const parser = new PlanificationCoursService({} as HttpService);
    const rows = await parser.parsePlanificationCoursPdf(
      fs.readFileSync(PLANIFICATION_PDF_V2_PATH),
      PLANIFICATION_PDF_V2_PATH
    );
    expect(rows.find((row) => row.code === 'GPE450')?.available.H27).toBe('JS');
    const course = { id: 4, code: 'GPE450' };
    courses.push(course);
    parseForecast.mockResolvedValue(rows);
    const winterSession = {
      ...session,
      year: 2027,
      trimester: Trimester.HIVER
    };
    jest
      .spyOn(sessionService, 'getOrCreateSessionFromCode')
      .mockImplementation(async (code: string) =>
        code === 'H27' ? winterSession : session
      );

    await forecast.processCourseInstances();

    expect(instances.updateCourseInstances).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          session: winterSession,
          offerings: expect.arrayContaining([
            { courseId: course.id, availability: ['JOUR', 'SOIR'] }
          ])
        })
      ])
    );
  });

  it('combines availability for the same course and session across program forecasts', async () => {
    parseForecast.mockImplementation(async (code: string) => [
      { code: 'LOG200', available: { H27: code === '7086' ? 'J' : 'S' } }
    ]);
    const winterSession = {
      ...session,
      year: 2027,
      trimester: Trimester.HIVER
    };
    jest
      .spyOn(sessionService, 'getOrCreateSessionFromCode')
      .mockResolvedValue(winterSession);

    await forecast.processCourseInstances();

    expect(instances.updateCourseInstances).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          offerings: [{ courseId: 1, availability: ['JOUR'] }]
        }),
        expect.objectContaining({
          offerings: [{ courseId: 1, availability: ['SOIR'] }]
        })
      ])
    );
  });

  describe('Destructive membership synchronization', () => {
    const existingOffering = {
      courseId: 2,
      sessionYear: 2027,
      sessionTrimester: 'HIVER',
      availability: ['JOUR'],
      createdAt: date,
      updatedAt: date
    };

    it.each(['download failure', 'empty forecast'])(
      'syncs successful forecasts without deleting offerings after a %s',
      async (problem) => {
        parseForecast.mockImplementation(async (code: string) => {
          if (code === '7084') {
            if (problem === 'download failure') throw new Error('HTTP 404');
            return [];
          }
          return [{ code: 'LOG200', available: { A26: 'J' } }];
        });
        instances.getAllCourseInstances.mockResolvedValue([existingOffering]);

        await forecast.processCourseInstances();

        expect(instances.updateCourseInstances).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              offerings: [{ courseId: 1, availability: ['JOUR'] }]
            })
          ])
        );
        expect(instances.deleteCourseInstance).not.toHaveBeenCalled();
      }
    );

    it('seeds umbrella programs before selecting forecasts', async () => {
      const { seedUmbrellaPrograms } = jest.requireMock(
        '../../src/prisma/programs.seeder'
      ) as { seedUmbrellaPrograms: jest.Mock };

      await forecast.processCourseInstances();

      expect(seedUmbrellaPrograms).toHaveBeenCalled();
      expect(seedUmbrellaPrograms.mock.invocationCallOrder.at(-1)).toBeLessThan(
        (
          programService.getProgramsByPlanificationParsablePDF as jest.Mock
        ).mock.invocationCallOrder.at(-1)!
      );
    });

    it('passes blank header sessions to reconciliation without inventing coverage', async () => {
      forecastSessionCodes = ['H27'];
      parseForecast.mockResolvedValue(largeForecast());
      const winter = { ...session, year: 2027, trimester: Trimester.HIVER };
      jest
        .spyOn(sessionService, 'getOrCreateSessionFromCode')
        .mockResolvedValue(winter);
      await forecast.processCourseInstances();
      expect(sessionService.getOrCreateSessionFromCode).toHaveBeenCalledTimes(
        2
      );
      expect(sessionService.getOrCreateSessionFromCode).toHaveBeenCalledWith(
        'H27'
      );
      const [inputs] = instances.updateCourseInstances.mock.calls[0];
      expect(inputs).toHaveLength(2);
      expect(
        inputs.every(
          (input: {
            session: typeof winter;
            offerings: { availability: unknown[] }[];
          }) =>
            input.session === winter &&
            input.offerings.every((row) => row.availability.length === 0)
        )
      ).toBe(true);
    });

    it('still deletes obsolete offerings after all forecasts succeed', async () => {
      parseForecast.mockResolvedValue(largeForecast());
      instances.getAllCourseInstances.mockResolvedValue([existingOffering]);

      await forecast.processCourseInstances();

      expect(instances.updateCourseInstances).toHaveBeenCalledWith(
        expect.any(Array)
      );
    });

    it('preserves schedule-owned instances during complete forecast deletion', async () => {
      (programService.getProgramByCode as jest.Mock).mockResolvedValue({
        id: -1
      });
      links.push(
        {
          courseId: 1,
          programId: -1,
          type: null,
          typicalSessionIndex: null,
          unstructuredPrerequisite: null,
          createdAt: date,
          updatedAt: date
        },
        {
          courseId: 2,
          programId: -1,
          type: null,
          typicalSessionIndex: null,
          unstructuredPrerequisite: null,
          createdAt: date,
          updatedAt: date
        }
      );
      const rows = largeForecast();
      rows.find((row) => row.code === 'LOG200')!.available = { A26: 'J' };
      parseForecast.mockResolvedValue(rows);
      const uqamInstance = {
        courseId: 1,
        sessionYear: 2026,
        sessionTrimester: Trimester.AUTOMNE,
        availability: ['JOUR', 'SOIR'],
        createdAt: date,
        updatedAt: date
      };
      instances.getAllCourseInstances.mockResolvedValue([
        uqamInstance,
        {
          courseId: 2,
          sessionYear: 2027,
          sessionTrimester: 'HIVER',
          availability: ['SOIR'],
          createdAt: date,
          updatedAt: date
        },
        {
          courseId: 3,
          sessionYear: 2027,
          sessionTrimester: 'HIVER',
          availability: ['JOUR'],
          createdAt: date,
          updatedAt: date
        }
      ]);

      await forecast.processCourseInstances();

      // LOG200 keeps schedule-derived availability instead of shrinking to J.
      expect(instances.updateCourseInstanceAvailability).not.toHaveBeenCalled();
      // MAT210 is schedule-owned: kept. LOG121 is not: deleted.
      expect(instances.deleteCourseInstance).not.toHaveBeenCalledWith(
        1,
        expect.anything(),
        expect.anything()
      );
      expect(instances.deleteCourseInstance).not.toHaveBeenCalledWith(
        2,
        expect.anything(),
        expect.anything()
      );
      expect(instances.updateCourseInstances).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            offerings: expect.arrayContaining([
              { courseId: 1, availability: ['JOUR'] }
            ])
          })
        ])
      );
    });

    it('does not delete offerings when every forecast is suspiciously small', async () => {
      parseForecast.mockResolvedValue([
        { code: 'LOG200', available: { A26: 'J' } }
      ]);
      instances.getAllCourseInstances.mockResolvedValue([existingOffering]);

      await forecast.processCourseInstances();

      expect(instances.deleteCourseInstance).not.toHaveBeenCalled();
    });

    it.each(['invalid row', 'missing catalog course'])(
      'does not delete offerings when a large forecast has a %s',
      async (problem) => {
        const rows = largeForecast();
        rows.push({
          code: problem === 'invalid row' ? 'NOT-A-COURSE' : 'LOG999',
          available: {}
        });
        parseForecast.mockImplementation(async (code: string) =>
          code === '7086' ? rows : largeForecast()
        );
        instances.getAllCourseInstances.mockResolvedValue([existingOffering]);

        await forecast.processCourseInstances();

        expect(instances.deleteCourseInstance).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Skipping program-course pruning for program 7086'
          )
        );
      }
    );

    it('does not remove an evening offering when its program forecast fails', async () => {
      const rows = largeForecast().map((row) =>
        row.code === 'LOG200' ? { ...row, available: { A26: 'J' } } : row
      );
      parseForecast.mockImplementation(async (code: string) => {
        if (code === '7084') throw new Error('HTTP 404');
        return rows;
      });
      instances.getAllCourseInstances.mockResolvedValue([
        {
          ...existingOffering,
          courseId: 1,
          sessionYear: 2026,
          sessionTrimester: Trimester.AUTOMNE,
          availability: ['JOUR', 'SOIR']
        }
      ]);

      await forecast.processCourseInstances();

      expect(instances.updateCourseInstanceAvailability).not.toHaveBeenCalled();
    });

    it('adds availability from a partial forecast without removing existing availability', async () => {
      parseForecast.mockImplementation(async (code: string) => {
        if (code === '7084') throw new Error('HTTP 404');
        return [{ code: 'LOG200', available: { A26: 'J' } }];
      });
      const existing = {
        ...existingOffering,
        courseId: 1,
        sessionYear: 2026,
        sessionTrimester: Trimester.AUTOMNE,
        availability: ['SOIR']
      };
      instances.getAllCourseInstances.mockResolvedValue([existing]);

      await forecast.processCourseInstances();

      expect(instances.updateCourseInstances).toHaveBeenCalledWith(
        expect.any(Array)
      );
    });

    it('removes obsolete availability when all forecasts are complete', async () => {
      const rows = largeForecast().map((row) =>
        row.code === 'LOG200' ? { ...row, available: { A26: 'J' } } : row
      );
      parseForecast.mockResolvedValue(rows);
      const existing = {
        ...existingOffering,
        courseId: 1,
        sessionYear: 2026,
        sessionTrimester: Trimester.AUTOMNE,
        availability: ['JOUR', 'SOIR']
      };
      instances.getAllCourseInstances.mockResolvedValue([existing]);

      await forecast.processCourseInstances();

      expect(instances.updateCourseInstances).toHaveBeenCalledWith(
        expect.any(Array)
      );
    });

    it('preserves existing offerings when every forecast download fails', async () => {
      parseForecast.mockRejectedValue(new Error('HTTP 404'));
      instances.getAllCourseInstances.mockResolvedValue([
        {
          courseId: 1,
          sessionYear: 2026,
          sessionTrimester: 'AUTOMNE',
          availability: ['JOUR'],
          createdAt: date,
          updatedAt: date
        }
      ]);

      await forecast.processCourseInstances();

      expect(instances.deleteCourseInstance).not.toHaveBeenCalled();
    });

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
