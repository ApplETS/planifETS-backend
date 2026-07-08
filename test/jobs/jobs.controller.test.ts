import { Test, TestingModule } from '@nestjs/testing';

import { RunWorkersDto } from '../../src/jobs/dtos/run-workers.dto';
import { JobsController } from '../../src/jobs/jobs.controller';
import { JobsService } from '../../src/jobs/jobs.service';

describe('JobsController', () => {
  let controller: JobsController;

  const jobsService = {
    processJobs: jest.fn(),
    runWorker: jest.fn(),
    canRunJob: jest.fn()
  };

  const buildRunWorkersDto = (
    overrides: Partial<RunWorkersDto> = {}
  ): RunWorkersDto => ({
    processAllJobs: false,
    processPrograms: false,
    processCourses: false,
    processCourseDescriptions: false,
    processCourseInstances: false,
    processProgramCourses: false,
    processSessions: false,
    processCourseEmbeddings: false,
    ...overrides
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    jobsService.processJobs.mockResolvedValue(undefined);
    jobsService.runWorker.mockResolvedValue({ status: 'ok' });
    jobsService.canRunJob.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [{ provide: JobsService, useValue: jobsService }]
    }).compile();

    controller = module.get<JobsController>(JobsController);
  });

  it('should trigger all jobs when processAllJobs=true', async () => {
    const result = await controller.runWorkers(
      buildRunWorkersDto({ processAllJobs: true })
    );

    expect(jobsService.processJobs).toHaveBeenCalledTimes(1);
    expect(jobsService.runWorker).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'All jobs have been triggered' });
  });

  it('should trigger all jobs when body is undefined because processAllJobs defaults to true', async () => {
    const result = await controller.runWorkers(
      undefined as unknown as RunWorkersDto
    );

    expect(jobsService.processJobs).toHaveBeenCalledTimes(1);
    expect(jobsService.runWorker).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'All jobs have been triggered' });
  });

  it('should return no jobs triggered when processAllJobs=false and no flags are set', async () => {
    const result = await controller.runWorkers(buildRunWorkersDto());

    expect(jobsService.processJobs).not.toHaveBeenCalled();
    expect(jobsService.runWorker).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'No jobs triggered (no flags set)' });
  });

  it('should map all selected flags to their jobs and run them successfully', async () => {
    const result = await controller.runWorkers(
      buildRunWorkersDto({
        processPrograms: true,
        processCourses: true,
        processCourseDescriptions: true,
        processCourseInstances: true,
        processProgramCourses: true,
        processSessions: true,
        processCourseEmbeddings: true
      })
    );

    expect(jobsService.runWorker).toHaveBeenCalledTimes(7);
    expect(jobsService.runWorker).toHaveBeenNthCalledWith(
      1,
      'ProgramsJobService',
      'processPrograms'
    );
    expect(jobsService.runWorker).toHaveBeenNthCalledWith(
      2,
      'CoursesJobService',
      'processCourses'
    );
    expect(jobsService.runWorker).toHaveBeenNthCalledWith(
      3,
      'CoursesJobService',
      'syncCourseDescriptionsFromEtsWebsite'
    );
    expect(jobsService.runWorker).toHaveBeenNthCalledWith(
      4,
      'CourseInstancesJobService',
      'processCourseInstances'
    );
    expect(jobsService.runWorker).toHaveBeenNthCalledWith(
      5,
      'CoursesJobService',
      'syncCourseDetailsWithCheminotData'
    );
    expect(jobsService.runWorker).toHaveBeenNthCalledWith(
      6,
      'SessionsJobService',
      'processSessions'
    );
    expect(jobsService.runWorker).toHaveBeenNthCalledWith(
      7,
      'CourseEmbeddingIndexerService',
      'run'
    );

    expect(result).toEqual({
      status: 'Selected jobs processed',
      results: [
        {
          job: { service: 'ProgramsJobService', method: 'processPrograms' },
          status: 'success'
        },
        {
          job: { service: 'CoursesJobService', method: 'processCourses' },
          status: 'success'
        },
        {
          job: {
            service: 'CoursesJobService',
            method: 'syncCourseDescriptionsFromEtsWebsite'
          },
          status: 'success'
        },
        {
          job: {
            service: 'CourseInstancesJobService',
            method: 'processCourseInstances'
          },
          status: 'success'
        },
        {
          job: {
            service: 'CoursesJobService',
            method: 'syncCourseDetailsWithCheminotData'
          },
          status: 'success'
        },
        {
          job: { service: 'SessionsJobService', method: 'processSessions' },
          status: 'success'
        },
        {
          job: {
            service: 'CourseEmbeddingIndexerService',
            method: 'run'
          },
          status: 'success'
        }
      ]
    });
  });

  it('should skip a selected job when JobsService.canRunJob returns false', async () => {
    jobsService.canRunJob.mockImplementation(
      (service: string, method: string) =>
        !(service === 'CourseEmbeddingIndexerService' && method === 'run')
    );

    const result = await controller.runWorkers(
      buildRunWorkersDto({
        processCourseEmbeddings: true
      })
    );

    expect(jobsService.runWorker).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'Selected jobs processed',
      results: [
        {
          job: {
            service: 'CourseEmbeddingIndexerService',
            method: 'run'
          },
          status: 'skipped',
          reason: 'CHATBOT_ENABLED=false'
        }
      ]
    });
  });

  it('should return an error result when a selected job fails with an Error', async () => {
    jobsService.runWorker.mockRejectedValue(new Error('worker failed'));

    const result = await controller.runWorkers(
      buildRunWorkersDto({
        processCourses: true
      })
    );

    expect(result).toEqual({
      status: 'Selected jobs processed',
      results: [
        {
          job: {
            service: 'CoursesJobService',
            method: 'processCourses'
          },
          status: 'error',
          error: 'worker failed'
        }
      ]
    });
  });

  it('should return an error result when a selected job fails with a non-Error value', async () => {
    jobsService.runWorker.mockRejectedValue('worker failed');

    const result = await controller.runWorkers(
      buildRunWorkersDto({
        processCourses: true
      })
    );

    expect(result).toEqual({
      status: 'Selected jobs processed',
      results: [
        {
          job: {
            service: 'CoursesJobService',
            method: 'processCourses'
          },
          status: 'error',
          error: 'worker failed'
        }
      ]
    });
  });

  it('should continue processing remaining selected jobs after one fails', async () => {
    jobsService.runWorker
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce({ status: 'ok' });

    const result = await controller.runWorkers(
      buildRunWorkersDto({
        processPrograms: true,
        processCourses: true
      })
    );

    expect(jobsService.runWorker).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      status: 'Selected jobs processed',
      results: [
        {
          job: {
            service: 'ProgramsJobService',
            method: 'processPrograms'
          },
          status: 'error',
          error: 'first failed'
        },
        {
          job: {
            service: 'CoursesJobService',
            method: 'processCourses'
          },
          status: 'success'
        }
      ]
    });
  });
});
