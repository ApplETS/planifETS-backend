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
    getCoursesForDescriptionSync: jest.Mock;
    updateCourseDescriptionsBatch: jest.Mock;
  };

  beforeEach(() => {
    etsCourseServiceMock = {
      fetchCourseDescriptionFromEtsWebsite: jest.fn(),
    };

    courseServiceMock = {
      getCoursesForDescriptionSync: jest.fn(),
      updateCourseDescriptionsBatch: jest.fn(),
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
    courseServiceMock.getCoursesForDescriptionSync.mockResolvedValue([
      { id: 1, code: 'LOG210', description: 'Old description' },
      { id: 2, code: 'LOG121', description: 'Already correct' },
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
    expect(courseServiceMock.updateCourseDescriptionsBatch).toHaveBeenCalledTimes(1);
    expect(courseServiceMock.updateCourseDescriptionsBatch).toHaveBeenCalledWith([
      {
        id: 1,
        code: 'LOG210',
        description: 'New description',
      },
    ]);
  });

  it('keeps existing descriptions when one scrape fails and continues processing', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    courseServiceMock.getCoursesForDescriptionSync.mockResolvedValue([
      { id: 1, code: 'LOG210', description: 'Old description' },
      { id: 2, code: 'LOG121', description: 'Old description' },
    ]);
    etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite
      .mockRejectedValueOnce(new Error('HTTP 404'))
      .mockResolvedValueOnce('Updated LOG121');

    await service.syncCourseDescriptionsFromEtsWebsite();

    expect(courseServiceMock.updateCourseDescriptionsBatch).toHaveBeenCalledTimes(1);
    expect(courseServiceMock.updateCourseDescriptionsBatch).toHaveBeenCalledWith([
      {
        id: 2,
        code: 'LOG121',
        description: 'Updated LOG121',
      },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to sync description for courses [LOG210]: HTTP 404',
    );
  });

  it('skips courses with missing codes', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    courseServiceMock.getCoursesForDescriptionSync.mockResolvedValue([
      { id: 3, code: '' as unknown as Course['code'], description: 'Old description' },
      { id: 4, code: 'LOG121', description: 'Old description' },
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

    courseServiceMock.getCoursesForDescriptionSync.mockResolvedValue([
      { id: 1, code: 'LOG210', description: 'Old description' },
      { id: 2, code: 'LOG121', description: 'Keep me' },
    ]);
    etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite
      .mockResolvedValueOnce('Fresh description')
      .mockRejectedValueOnce(new Error('Timeout'));

    await service.syncCourseDescriptionsFromEtsWebsite();

    expect(logSpy).toHaveBeenCalledWith(
      'Course description sync completed. Processed 2 courses, updated 1, skipped 0, failed 1.',
    );
  });

  it('batches updates and groups failed courses by shared error message', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    courseServiceMock.getCoursesForDescriptionSync.mockResolvedValue([
      { id: 1, code: 'LOG001', description: 'Old 1' },
      { id: 2, code: 'LOG002', description: 'Old 2' },
      { id: 3, code: 'LOG003', description: 'Old 3' },
      { id: 4, code: 'LOG004', description: 'Old 4' },
      { id: 5, code: 'LOG005', description: 'Old 5' },
      { id: 6, code: 'LOG006', description: 'Old 6' },
      { id: 7, code: 'LOG007', description: 'Old 7' },
      { id: 8, code: 'LOG008', description: 'Old 8' },
      { id: 9, code: 'LOG009', description: 'Old 9' },
      { id: 10, code: 'LOG010', description: 'Old 10' },
      { id: 11, code: 'LOG011', description: 'Old 11' },
      { id: 12, code: 'LOG012', description: 'Old 12' },
    ]);
    etsCourseServiceMock.fetchCourseDescriptionFromEtsWebsite
      .mockResolvedValueOnce('New 1')
      .mockRejectedValueOnce(
        new Error('Could not extract course description from ETS website'),
      )
      .mockResolvedValueOnce('New 3')
      .mockResolvedValueOnce('New 4')
      .mockResolvedValueOnce('New 5')
      .mockResolvedValueOnce('New 6')
      .mockResolvedValueOnce('New 7')
      .mockResolvedValueOnce('New 8')
      .mockResolvedValueOnce('New 9')
      .mockRejectedValueOnce(
        new Error('Could not extract course description from ETS website'),
      )
      .mockResolvedValueOnce('New 11')
      .mockResolvedValueOnce('New 12');

    await service.syncCourseDescriptionsFromEtsWebsite();

    expect(courseServiceMock.updateCourseDescriptionsBatch).toHaveBeenCalledTimes(2);
    expect(courseServiceMock.updateCourseDescriptionsBatch).toHaveBeenNthCalledWith(
      1,
      [
        { id: 1, code: 'LOG001', description: 'New 1' },
        { id: 3, code: 'LOG003', description: 'New 3' },
        { id: 4, code: 'LOG004', description: 'New 4' },
        { id: 5, code: 'LOG005', description: 'New 5' },
        { id: 6, code: 'LOG006', description: 'New 6' },
        { id: 7, code: 'LOG007', description: 'New 7' },
        { id: 8, code: 'LOG008', description: 'New 8' },
        { id: 9, code: 'LOG009', description: 'New 9' },
      ],
    );
    expect(courseServiceMock.updateCourseDescriptionsBatch).toHaveBeenNthCalledWith(
      2,
      [
        { id: 11, code: 'LOG011', description: 'New 11' },
        { id: 12, code: 'LOG012', description: 'New 12' },
      ],
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to sync description for courses [LOG002, LOG010]: Could not extract course description from ETS website',
    );
  });
});
