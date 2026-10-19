import { Logger } from '@nestjs/common';
import { Trimester } from '@prisma/client';

import { CourseCodeValidationPipe } from '../../src/common/pipes/models/course/course-code-validation-pipe';
import { HoraireCoursService } from '../../src/common/website-helper/pdf/pdf-parser/horaire/horaire-cours.service';
import { CourseService } from '../../src/course/course.service';
import { CourseInstanceService } from '../../src/course-instance/course-instance.service';
import { SessionsJobService } from '../../src/jobs/workers/sessions.worker';
import { PrerequisiteService } from '../../src/prerequisite/prerequisite.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { seedUmbrellaPrograms } from '../../src/prisma/programs.seeder';
import * as programFlags from '../../src/prisma/seeds/data/programs-to-seed.json';
import { ProgramService } from '../../src/program/program.service';
import { ProgramCourseService } from '../../src/program-course/program-course.service';
import { SessionService } from '../../src/session/session.service';

jest.mock('../../src/prisma/programs.seeder', () => ({
  seedProgramPlanificationPdfParserFlags: jest.fn(),
  seedProgramHorairePdfParserFlags: jest.fn(),
  seedUmbrellaPrograms: jest.fn(),
  UQAM_PROGRAM_CODE: 'UQAM'
}));

describe('SessionsJobService (UQAM agreement schedule)', () => {
  const date = new Date('2026-10-02T12:00:00Z');
  const session = {
    year: 2026,
    trimester: Trimester.AUTOMNE,
    createdAt: date,
    updatedAt: date
  };
  const programs = [
    { id: -1, code: 'UQAM' },
    { id: 10, code: '7086' }
  ];
  const courses = [
    { id: 1, code: 'DST202' },
    { id: 2, code: 'DST404' },
    { id: 3, code: 'LOG200' }
  ];
  const morningPeriods = [
    { day: 'Ven', time: '09:00 - 12:30', activity: 'C', mode: 'P' },
    { day: 'Ven', time: '13:30 - 15:30', activity: 'TP/Labo', mode: 'P' }
  ];
  const eveningPeriods = [
    { day: 'Mer', time: '18:00 - 21:00', activity: 'C', mode: 'P' }
  ];

  let sessions: SessionsJobService;
  let parseHoraire: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let links: Array<{ courseId: number; programId: number }>;
  let programCourseService: ProgramCourseService;
  let courseInstances: {
    updateCourseInstances: jest.Mock;
    getCourseInstance: jest.Mock;
    createCourseInstance: jest.Mock;
    updateCourseInstanceAvailability: jest.Mock;
    deleteCourseInstance: jest.Mock;
  };

  function uqamRows(): Array<{
    code: string;
    title: string;
    prerequisites: string;
    groups: Record<string, { periods: typeof morningPeriods }>;
  }> {
    return [
      {
        code: 'DST202',
        title: 'INTEGRATION SCIENCE ET TECHNOLOGIE',
        prerequisites: '',
        groups: { '01': { periods: morningPeriods } }
      },
      {
        code: 'DST404',
        title: "CONCEPTION ET ANALYSE D'OBJETS TECHNIQUES",
        prerequisites: '',
        groups: { '01': { periods: morningPeriods } }
      }
    ];
  }

  beforeEach(() => {
    links = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    parseHoraire = jest.fn(async (url: string) =>
      url.endsWith('_UQAM.pdf') ? uqamRows() : []
    );
    const courseService = {
      getCoursesByCodes: jest.fn((codes: string[]) =>
        courses.filter((c) => codes.includes(c.code))
      ),
      getCourseByCode: jest.fn(
        (code: string) => courses.find((c) => c.code === code) ?? null
      )
    } as unknown as CourseService;
    const programService = {
      getProgramsByPlanificationParsablePDF: jest.fn(),
      getProgramsByHoraireParsablePDF: jest.fn().mockResolvedValue(programs)
    } as unknown as ProgramService;
    const sessionService = {
      getOrCreateCurrentSession: jest.fn().mockResolvedValue(session),
      getOrCreateSessionFromCode: jest.fn().mockResolvedValue(session)
    } as unknown as SessionService;
    const prisma = {
      programCourse: {
        findMany: jest.fn(({ where }: { where: { programId: number } }) =>
          links.filter((link) => link.programId === where.programId)
        ),
        findFirst: jest.fn(
          ({ where }: { where: { courseId: number; programId: number } }) =>
            links.find(
              (link) =>
                link.courseId === where.courseId &&
                link.programId === where.programId
            ) ?? null
        ),
        findUnique: jest.fn(
          ({
            where
          }: {
            where: {
              courseId_programId: { courseId: number; programId: number };
            };
          }) => {
            const key = where.courseId_programId;
            const found = links.find(
              (link) =>
                link.courseId === key.courseId &&
                link.programId === key.programId
            );
            return found ? { ...found, prerequisites: [] } : null;
          }
        ),
        create: jest.fn(
          ({
            data
          }: {
            data: {
              course: { connect: { id: number } };
              program: { connect: { id: number } };
            };
          }) => {
            const link = {
              courseId: data.course.connect.id,
              programId: data.program.connect.id
            };
            links.push(link);
            return link;
          }
        )
      }
    } as unknown as PrismaService;
    programCourseService = new ProgramCourseService(prisma);
    const prerequisiteService = {
      updateUnstructuredPrerequisite: jest.fn().mockResolvedValue(0),
      deletePrerequisitesForProgramCourse: jest.fn().mockResolvedValue(0),
      deletePrerequisiteForProgramCourse: jest.fn().mockResolvedValue(0),
      addPrerequisiteIfNotExists: jest.fn().mockResolvedValue(false)
    } as unknown as PrerequisiteService;
    courseInstances = {
      updateCourseInstances: jest.fn(),
      getCourseInstance: jest.fn().mockResolvedValue(null),
      createCourseInstance: jest.fn(),
      updateCourseInstanceAvailability: jest.fn(),
      deleteCourseInstance: jest.fn()
    };
    sessions = new SessionsJobService(
      sessionService,
      programService,
      { parsePdfFromUrl: parseHoraire } as unknown as HoraireCoursService,
      courseService,
      programCourseService,
      prerequisiteService,
      new CourseCodeValidationPipe(),
      courseInstances as unknown as CourseInstanceService
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('selects umbrella schedules for parsing', () => {
    expect(programFlags.horairePdfPrograms).toContain('UQAM');
    expect(programFlags.horairePdfPrograms).toContain('CyclesSuperieurs');
  });

  it('seeds umbrella programs and fetches the UQAM schedule for the current session', async () => {
    await sessions.processSessions();

    expect(seedUmbrellaPrograms).toHaveBeenCalled();
    expect(parseHoraire).toHaveBeenCalledWith(
      'https://horaire.etsmtl.ca/HorairePublication/HorairePublication_20263_UQAM.pdf'
    );
  });

  it('creates missing UQAM program links but keeps warning for regular programs', async () => {
    parseHoraire.mockImplementation(async (url: string) =>
      url.endsWith('_UQAM.pdf')
        ? uqamRows()
        : [{ code: 'LOG200', prerequisites: '', groups: {} }]
    );

    await sessions.processSessions();

    expect(
      links.filter((link) => link.programId === -1).map((link) => link.courseId)
    ).toEqual([1, 2]);
    expect(links.some((link) => link.programId === 10)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ProgramCourse not found for courseIds: [3]')
    );
  });

  it('creates daytime instances from morning meeting times', async () => {
    await sessions.processSessions();

    expect(courseInstances.updateCourseInstances).toHaveBeenCalledWith([
      {
        session,
        offerings: [
          { courseId: 1, availability: ['JOUR'] },
          { courseId: 2, availability: ['JOUR'] }
        ]
      }
    ]);
  });

  it('creates evening instances from late meeting times and unions mixed groups', async () => {
    parseHoraire.mockResolvedValue([
      {
        code: 'DST202',
        title: 'INTEGRATION SCIENCE ET TECHNOLOGIE',
        prerequisites: '',
        groups: {
          '01': { periods: morningPeriods },
          '02': { periods: eveningPeriods }
        }
      }
    ]);

    await sessions.processSessions();

    expect(courseInstances.updateCourseInstances).toHaveBeenCalledWith([
      {
        session,
        offerings: [{ courseId: 1, availability: ['JOUR', 'SOIR'] }]
      }
    ]);
  });

  it('updates an existing instance when the schedule changes, without deleting', async () => {
    const existing = {
      courseId: 1,
      sessionYear: 2026,
      sessionTrimester: Trimester.AUTOMNE,
      availability: ['SOIR'],
      createdAt: date,
      updatedAt: date
    };
    courseInstances.getCourseInstance.mockResolvedValue(existing);
    parseHoraire.mockResolvedValue([uqamRows()[0]]);

    await sessions.processSessions();

    expect(courseInstances.updateCourseInstances).toHaveBeenCalledWith([
      {
        session,
        offerings: [{ courseId: 1, availability: ['JOUR'] }]
      }
    ]);
  });

  it('skips only UQAM rows without parseable times and still syncs other rows', async () => {
    parseHoraire.mockResolvedValue([
      {
        code: 'DST202',
        title: 'INTEGRATION SCIENCE ET TECHNOLOGIE',
        prerequisites: '',
        groups: { '01': { periods: [{ day: 'Ven', time: '', activity: 'C' }] } }
      },
      uqamRows()[1]
    ]);

    await sessions.processSessions();

    expect(courseInstances.updateCourseInstances).toHaveBeenCalledWith([
      { session, offerings: [{ courseId: 2, availability: ['JOUR'] }] }
    ]);
    expect(
      links.some((link) => link.courseId === 1 && link.programId === -1)
    ).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Cannot infer availability for UQAM course DST202'
      )
    );
  });

  it('writes nothing when the UQAM schedule is empty', async () => {
    parseHoraire.mockRejectedValue(new Error('No courses found'));

    await sessions.processSessions();

    expect(links).toHaveLength(0);
    expect(courseInstances.updateCourseInstances).not.toHaveBeenCalled();
  });

  it('leaves a linked UQAM course instance untouched when its row is missing', async () => {
    parseHoraire.mockImplementation(async (url: string) =>
      url.endsWith('_UQAM.pdf') ? [uqamRows()[0]] : []
    );
    links.push({ courseId: 2, programId: -1 });
    await sessions.processSessions();

    expect(courseInstances.updateCourseInstances).toHaveBeenCalledWith([
      { session, offerings: [{ courseId: 1, availability: ['JOUR'] }] }
    ]);
    expect(courseInstances.deleteCourseInstance).not.toHaveBeenCalled();
  });

  it('does not pass listed UQAM rows with unparseable times to instance sync', async () => {
    parseHoraire.mockResolvedValue([
      {
        code: 'DST404',
        title: "CONCEPTION ET ANALYSE D'OBJETS TECHNIQUES",
        prerequisites: '',
        groups: { '01': { periods: [{ day: 'Ven', time: '', activity: 'C' }] } }
      }
    ]);
    links.push({ courseId: 2, programId: -1 });
    await sessions.processSessions();

    expect(courseInstances.updateCourseInstances).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no parseable meeting times')
    );
  });
});
