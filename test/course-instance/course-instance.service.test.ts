import {
  Availability,
  Course,
  CourseInstance,
  Prisma,
  Session,
  Trimester,
} from '@prisma/client';

import { CourseInstanceService } from '../../src/course-instance/course-instance.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseInstanceService', () => {
  let service: CourseInstanceService;
  let prismaMock: {
    courseInstance: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const now = new Date('2026-04-03T00:00:00.000Z');

  const buildCourse = (overrides: Partial<Course> = {}): Course => ({
    id: 352405,
    code: 'LOG121',
    title: 'Conception orientee objet',
    description: 'Introduction a la conception orientee objet.',
    credits: 3,
    cycle: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const buildSession = (overrides: Partial<Session> = {}): Session => ({
    year: 2026,
    trimester: Trimester.AUTOMNE,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const buildCourseInstance = (
    overrides: Partial<CourseInstance> = {},
  ): CourseInstance => ({
    courseId: 352405,
    sessionYear: 2026,
    sessionTrimester: Trimester.AUTOMNE,
    availability: [Availability.JOUR],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  beforeEach(() => {
    prismaMock = {
      courseInstance: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new CourseInstanceService(prismaMock as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gets a course instance by its composite key', async () => {
    const where: Prisma.CourseInstanceWhereUniqueInput = {
      courseId_sessionYear_sessionTrimester: {
        courseId: 352405,
        sessionYear: 2026,
        sessionTrimester: Trimester.AUTOMNE,
      },
    };
    const record = buildCourseInstance();

    prismaMock.courseInstance.findUnique.mockResolvedValue(record);

    await expect(service.getCourseInstance(where)).resolves.toBe(record);
    expect(prismaMock.courseInstance.findUnique).toHaveBeenCalledWith({
      where,
    });
  });

  it('gets course instances for the provided sessions', async () => {
    const sessions = [
      buildSession(),
      buildSession({ year: 2027, trimester: Trimester.HIVER }),
    ];
    const records = [
      buildCourseInstance(),
      buildCourseInstance({
        sessionYear: 2027,
        sessionTrimester: Trimester.HIVER,
        availability: [Availability.SOIR],
      }),
    ];

    prismaMock.courseInstance.findMany.mockResolvedValue(records);

    await expect(
      service.getCourseInstancesBySessions(sessions),
    ).resolves.toEqual(records);
    expect(prismaMock.courseInstance.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            sessionYear: 2026,
            sessionTrimester: Trimester.AUTOMNE,
          },
          {
            sessionYear: 2027,
            sessionTrimester: Trimester.HIVER,
          },
        ],
      },
    });
  });

  it('gets all course instances', async () => {
    const records = [buildCourseInstance()];

    prismaMock.courseInstance.findMany.mockResolvedValue(records);

    await expect(service.getAllCourseInstances()).resolves.toEqual(records);
    expect(prismaMock.courseInstance.findMany).toHaveBeenCalledWith();
  });

  it('maps course availability with the related sessions', async () => {
    const session = buildSession();
    const records = [
      {
        ...buildCourseInstance({ availability: [Availability.JOUR] }),
        session,
      },
      {
        ...buildCourseInstance({
          sessionYear: 2027,
          sessionTrimester: Trimester.HIVER,
          availability: [Availability.SOIR, Availability.INTENSIF],
        }),
        session: buildSession({
          year: 2027,
          trimester: Trimester.HIVER,
        }),
      },
    ];

    prismaMock.courseInstance.findMany.mockResolvedValue(records);

    await expect(service.getCourseAvailability(352405)).resolves.toEqual([
      {
        session,
        available: [Availability.JOUR],
      },
      {
        session: buildSession({
          year: 2027,
          trimester: Trimester.HIVER,
        }),
        available: [Availability.SOIR, Availability.INTENSIF],
      },
    ]);
    expect(prismaMock.courseInstance.findMany).toHaveBeenCalledWith({
      where: { courseId: 352405 },
      include: {
        session: true,
      },
    });
  });

  it('gets course instances by course id with the course relation included', async () => {
    const records = [
      {
        ...buildCourseInstance(),
        course: buildCourse(),
      },
    ];

    prismaMock.courseInstance.findMany.mockResolvedValue(records);

    await expect(service.getCourseInstancesByCourse(352405)).resolves.toEqual(
      records,
    );
    expect(prismaMock.courseInstance.findMany).toHaveBeenCalledWith({
      where: { courseId: 352405 },
      include: {
        course: true,
      },
    });
  });

  it('creates a course instance linked to its course and session', async () => {
    const course = buildCourse();
    const session = buildSession();
    const availability = [Availability.JOUR, Availability.SOIR];
    const createdRecord = buildCourseInstance({ availability });

    prismaMock.courseInstance.create.mockResolvedValue(createdRecord);

    await expect(
      service.createCourseInstance(course, session, availability),
    ).resolves.toEqual(createdRecord);
    expect(prismaMock.courseInstance.create).toHaveBeenCalledWith({
      data: {
        course: { connect: { id: course.id } },
        session: {
          connect: {
            year_trimester: {
              year: session.year,
              trimester: session.trimester,
            },
          },
        },
        availability,
      },
    });
  });

  it('updates a course instance availability by its composite key', async () => {
    const instance = buildCourseInstance();
    const availability = [Availability.INTENSIF];

    prismaMock.courseInstance.update.mockResolvedValue({
      ...instance,
      availability,
    });

    await expect(
      service.updateCourseInstanceAvailability(instance, availability),
    ).resolves.toBeUndefined();
    expect(prismaMock.courseInstance.update).toHaveBeenCalledWith({
      where: {
        courseId_sessionYear_sessionTrimester: {
          courseId: instance.courseId,
          sessionYear: instance.sessionYear,
          sessionTrimester: instance.sessionTrimester,
        },
      },
      data: { availability },
    });
  });

  it('deletes a course instance by its composite key', async () => {
    const deletedRecord = buildCourseInstance();

    prismaMock.courseInstance.delete.mockResolvedValue(deletedRecord);

    await expect(
      service.deleteCourseInstance(352405, 2026, Trimester.AUTOMNE),
    ).resolves.toEqual(deletedRecord);
    expect(prismaMock.courseInstance.delete).toHaveBeenCalledWith({
      where: {
        courseId_sessionYear_sessionTrimester: {
          courseId: 352405,
          sessionYear: 2026,
          sessionTrimester: Trimester.AUTOMNE,
        },
      },
    });
  });
});
