import { Test, TestingModule } from '@nestjs/testing';

import { JobsService } from '../../src/jobs/jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  let runWorkerSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsService],
    }).compile();
    service = module.get<JobsService>(JobsService);
    runWorkerSpy = jest.spyOn(service as unknown as { runWorker: JobsService['runWorker'] }, 'runWorker');
    loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => { });
    loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => { });
  });

  it('should process all jobs in order and call runWorker with correct service/method', async () => {
    const results = ['A', 'B', 'C', 'D', 'E'];
    runWorkerSpy.mockImplementation(() => Promise.resolve(results.shift()));
    await service.processJobs();
    expect(runWorkerSpy).toHaveBeenCalledTimes(5);
    expect(runWorkerSpy).toHaveBeenNthCalledWith(1, 'ProgramsJobService', 'processPrograms');
    expect(runWorkerSpy).toHaveBeenNthCalledWith(2, 'CoursesJobService', 'processCourses');
    expect(runWorkerSpy).toHaveBeenNthCalledWith(3, 'CourseInstancesJobService', 'processCourseInstances');
    expect(runWorkerSpy).toHaveBeenNthCalledWith(4, 'CoursesJobService', 'syncCourseDetailsWithCheminotData');
    expect(runWorkerSpy).toHaveBeenNthCalledWith(5, 'SessionsJobService', 'processSessions');
  });

  it('should continue processing jobs even if one fails', async () => {
    runWorkerSpy
      .mockResolvedValueOnce('ok1')
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('ok3')
      .mockResolvedValueOnce('ok4')
      .mockResolvedValueOnce('ok5');
    await service.processJobs();
    expect(runWorkerSpy).toHaveBeenCalledTimes(5);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Job 2 (CoursesJobService.processCourses) failed: fail2'),
      expect.any(String)
    );
  });

  it('should log job start, success, failure, and completion', async () => {
    runWorkerSpy
      .mockResolvedValueOnce('ok1')
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('ok3')
      .mockResolvedValueOnce('ok4')
      .mockResolvedValueOnce('ok5');
    await service.processJobs();
    expect(loggerLogSpy).toHaveBeenCalledWith('Starting sequential job processing...');
    expect(loggerLogSpy).toHaveBeenCalledWith('Starting job 1: ProgramsJobService.processPrograms');
    expect(loggerLogSpy).toHaveBeenCalledWith('Starting job 2: CoursesJobService.processCourses');
    expect(loggerLogSpy).toHaveBeenCalledWith('Starting job 3: CourseInstancesJobService.processCourseInstances');
    expect(loggerLogSpy).toHaveBeenCalledWith('Starting job 4: CoursesJobService.syncCourseDetailsWithCheminotData');
    expect(loggerLogSpy).toHaveBeenCalledWith('Starting job 5: SessionsJobService.processSessions');
    expect(loggerLogSpy).toHaveBeenCalledWith('Job processing completed.');
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Job 1 (ProgramsJobService.processPrograms) completed successfully'),
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Job 2 (CoursesJobService.processCourses) failed: fail2'),
      expect.any(String)
    );
  });
});
