import { Logger } from '@nestjs/common';
import { Course } from '@prisma/client';

import { CheminotService } from '../../src/common/api-helper/cheminot/cheminot.service';
import { EtsCourseService } from '../../src/common/api-helper/ets/course/ets-course.service';
import { CourseService } from '../../src/course/course.service';
import { CoursesJobService } from '../../src/jobs/workers/courses.worker';
import { ProgramService } from '../../src/program/program.service';
import { ProgramCourseService } from '../../src/program-course/program-course.service';

describe('CoursesJobService', () => {
  let service: CoursesJobService;
  let logger: Logger;
  let etsCourseServiceMock: {
    fetchCourseDescriptionFromEtsWebsite: jest.Mock;
  };
  let courseServiceMock: {
    getAllCourses: jest.Mock;
    updateCourse: jest.Mock;
  };

  const buildCourse = (overrides: Partial<Course> = {}): Course => ({
    id: 1,
    code: 'LOG210',
    title: 'Analyse et conception de logiciels',
    description: 'Old description',
    credits: 4,
    cycle: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    etsCourseServiceMock = {
      fetchCourseDescriptionFromEtsWebsite: jest.fn(),
    };

    courseServiceMock = {
      getAllCourses: jest.fn(),
      updateCourse: jest.fn(),
    };

    service = new CoursesJobService(
      etsCourseServiceMock as unknown as EtsCourseService,
      courseServiceMock as unknown as CourseService,
      {} as ProgramCourseService,
      {} as ProgramService,
      {} as CheminotService,
    );
    logger = (service as unknown as { logger: Logger }).logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('updates course descriptions from the website when they changed', async () => {
    courseServiceMock.getAllCourses.mockResolvedValue([
      buildCourse(),
      buildCourse({ id: 2, code: 'LOG121', description: 'Already correct' }),
    ]);
    etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite
      .mockResolvedValueOnce('New description')
      .mockResolvedValueOnce('Already correct');

    await service.syncCourseDescriptionsFromEtsWebsite();

    expect(
      etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite,
    ).toHaveBeenNthCalledWith(1, 'LOG210');
    expect(
      etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite,
    ).toHaveBeenNthCalledWith(2, 'LOG121');
    expect(courseServiceMock.updateCourse).toHaveBeenCalledTimes(1);
    expect(courseServiceMock.updateCourse).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        code: 'LOG210',
        description: 'New description',
      },
    });
  });

  it('keeps existing descriptions when one scrape fails and continues processing', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    courseServiceMock.getAllCourses.mockResolvedValue([
      buildCourse({ code: 'LOG210' }),
      buildCourse({ id: 2, code: 'LOG121' }),
    ]);
    etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite
      .mockRejectedValueOnce(new Error('HTTP 404'))
      .mockResolvedValueOnce('Updated LOG121');

    await service.syncCourseDescriptionsFromEtsWebsite();

    expect(courseServiceMock.updateCourse).toHaveBeenCalledTimes(1);
    expect(courseServiceMock.updateCourse).toHaveBeenCalledWith({
      where: { id: 2 },
      data: {
        code: 'LOG121',
        description: 'Updated LOG121',
      },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to sync description for course LOG210: HTTP 404',
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Course description sync failures: ["LOG210"]',
    );
  });

  it('skips courses with missing codes', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    courseServiceMock.getAllCourses.mockResolvedValue([
      buildCourse({ id: 3, code: '' as unknown as Course['code'] }),
      buildCourse({ id: 4, code: 'LOG121' }),
    ]);
    etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite
      .mockResolvedValueOnce('Updated LOG121');

    await service.syncCourseDescriptionsFromEtsWebsite();

    expect(
      etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite,
    ).toHaveBeenCalledTimes(1);
    expect(
      etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite,
    ).toHaveBeenCalledWith('LOG121');
    expect(warnSpy).toHaveBeenCalledWith(
      'Skipping course description sync for course 3: missing course code.',
    );
  });

  it('logs the summary counts after syncing descriptions', async () => {
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});

    courseServiceMock.getAllCourses.mockResolvedValue([
      buildCourse({ code: 'LOG210', description: 'Old description' }),
      buildCourse({ id: 2, code: 'LOG121', description: 'Keep me' }),
    ]);
    etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite
      .mockResolvedValueOnce('Fresh description')
      .mockRejectedValueOnce(new Error('Timeout'));

    await service.syncCourseDescriptionsFromEtsWebsite();

    expect(logSpy).toHaveBeenCalledWith(
      'Course description sync completed. Processed 2 courses, updated 1, skipped 0, failed 1.',
    );
  });
});
