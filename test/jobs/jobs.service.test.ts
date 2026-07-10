import { Worker } from 'node:worker_threads';

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { JobsService } from '../../src/jobs/jobs.service';

jest.mock('node:worker_threads', () => ({
  isMainThread: true,
  Worker: jest.fn()
}));

class FakeWorker {
  private readonly handlers = new Map<string, (payload: unknown) => void>();

  constructor(
    public readonly script: string,
    public readonly options: unknown
  ) {}

  public on(event: string, handler: (payload: unknown) => void): FakeWorker {
    this.handlers.set(event, handler);
    return this;
  }

  public emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.(payload);
  }
}

describe('JobsService', () => {
  let service: JobsService;
  let runWorkerSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerVerboseSpy: jest.SpyInstance;
  let fakeWorkers: FakeWorker[];

  const WorkerMock = Worker as unknown as jest.Mock;

  async function createService(chatbotEnabled = true): Promise<void> {
    fakeWorkers = [];

    WorkerMock.mockImplementation((script: string, options: unknown) => {
      const worker = new FakeWorker(script, options);
      fakeWorkers.push(worker);
      return worker;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'chatbot.enabled') {
                return chatbotEnabled;
              }

              return defaultValue;
            })
          }
        }
      ]
    }).compile();

    service = module.get<JobsService>(JobsService);

    runWorkerSpy = jest.spyOn(
      service as unknown as { runWorker: JobsService['runWorker'] },
      'runWorker'
    );

    loggerLogSpy = jest
      .spyOn(service['logger'], 'log')
      .mockImplementation(() => {});

    loggerDebugSpy = jest
      .spyOn(service['logger'], 'debug')
      .mockImplementation(() => {});

    loggerErrorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => {});

    loggerVerboseSpy = jest
      .spyOn(service['logger'], 'verbose')
      .mockImplementation(() => {});
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    WorkerMock.mockReset();
    await createService(true);
  });

  afterEach(() => {
    delete process.env.APP_ENV;
  });

  it('should process all jobs in order and call runWorker with correct service/method', async () => {
    const results = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    runWorkerSpy.mockImplementation(() => Promise.resolve(results.shift()));

    await service.processJobs();

    expect(runWorkerSpy).toHaveBeenCalledTimes(7);
    expect(runWorkerSpy).toHaveBeenNthCalledWith(
      1,
      'ProgramsJobService',
      'processPrograms'
    );
    expect(runWorkerSpy).toHaveBeenNthCalledWith(
      2,
      'CoursesJobService',
      'processCourses'
    );
    expect(runWorkerSpy).toHaveBeenNthCalledWith(
      3,
      'CoursesJobService',
      'syncCourseDescriptionsFromEtsWebsite'
    );
    expect(runWorkerSpy).toHaveBeenNthCalledWith(
      4,
      'CourseInstancesJobService',
      'processCourseInstances'
    );
    expect(runWorkerSpy).toHaveBeenNthCalledWith(
      5,
      'CoursesJobService',
      'syncCourseDetailsWithCheminotData'
    );
    expect(runWorkerSpy).toHaveBeenNthCalledWith(
      6,
      'SessionsJobService',
      'processSessions'
    );
    expect(runWorkerSpy).toHaveBeenNthCalledWith(
      7,
      'CourseEmbeddingIndexerService',
      'run'
    );
  });

  it('should continue processing jobs even if one fails with an Error', async () => {
    runWorkerSpy
      .mockResolvedValueOnce('ok1')
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('ok3')
      .mockResolvedValueOnce('ok4')
      .mockResolvedValueOnce('ok5')
      .mockResolvedValueOnce('ok6')
      .mockResolvedValueOnce('ok7');

    await service.processJobs();

    expect(runWorkerSpy).toHaveBeenCalledTimes(7);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Job 2 (CoursesJobService.processCourses) failed: fail2'
      ),
      expect.any(String)
    );
  });

  it('should continue processing jobs even if one fails with a non-Error value', async () => {
    runWorkerSpy
      .mockResolvedValueOnce('ok1')
      .mockRejectedValueOnce('fail2')
      .mockResolvedValueOnce('ok3')
      .mockResolvedValueOnce('ok4')
      .mockResolvedValueOnce('ok5')
      .mockResolvedValueOnce('ok6')
      .mockResolvedValueOnce('ok7');

    await service.processJobs();

    expect(runWorkerSpy).toHaveBeenCalledTimes(7);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Job 2 (CoursesJobService.processCourses) failed: fail2'
    );
  });

  it('should log job start, success, failure, debug, and completion', async () => {
    runWorkerSpy
      .mockResolvedValueOnce('ok1')
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('ok3')
      .mockResolvedValueOnce('ok4')
      .mockResolvedValueOnce('ok5')
      .mockResolvedValueOnce('ok6')
      .mockResolvedValueOnce('ok7');

    await service.processJobs();

    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting sequential job processing...'
    );
    expect(loggerDebugSpy).toHaveBeenCalledWith(
      'Are we on the main thread?',
      'Yes'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting job 1: ProgramsJobService.processPrograms'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting job 2: CoursesJobService.processCourses'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting job 3: CoursesJobService.syncCourseDescriptionsFromEtsWebsite'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting job 4: CourseInstancesJobService.processCourseInstances'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting job 5: CoursesJobService.syncCourseDetailsWithCheminotData'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting job 6: SessionsJobService.processSessions'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Starting job 7: CourseEmbeddingIndexerService.run'
    );
    expect(loggerLogSpy).toHaveBeenCalledWith('Job processing completed.');
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Job 1 (ProgramsJobService.processPrograms) completed :'
      )
    );
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Job 2 (CoursesJobService.processCourses) failed: fail2'
      ),
      expect.any(String)
    );
  });

  it('should identify the chatbot embedding job', () => {
    expect(service.isChatbotJob('CourseEmbeddingIndexerService', 'run')).toBe(
      true
    );
  });

  it('should not identify other jobs as chatbot jobs', () => {
    expect(service.isChatbotJob('ProgramsJobService', 'processPrograms')).toBe(
      false
    );
    expect(
      service.isChatbotJob('CourseEmbeddingIndexerService', 'otherMethod')
    ).toBe(false);
  });

  it('should allow non-chatbot jobs when CHATBOT_ENABLED=false', async () => {
    await createService(false);

    expect(service.canRunJob('ProgramsJobService', 'processPrograms')).toBe(
      true
    );
  });

  it('should block the course embedding job when CHATBOT_ENABLED=false', async () => {
    await createService(false);

    expect(service.canRunJob('CourseEmbeddingIndexerService', 'run')).toBe(
      false
    );
  });

  it('should allow the course embedding job when CHATBOT_ENABLED=true', async () => {
    await createService(true);

    expect(service.canRunJob('CourseEmbeddingIndexerService', 'run')).toBe(
      true
    );
  });

  it('should allow the course embedding job when CHATBOT_ENABLED has uppercase TRUE', async () => {
    await createService(true);

    expect(service.canRunJob('CourseEmbeddingIndexerService', 'run')).toBe(
      true
    );
  });

  it('should skip CourseEmbeddingIndexerService.run during processJobs when CHATBOT_ENABLED=false', async () => {
    await createService(false);

    runWorkerSpy.mockResolvedValue({ status: 'ok' });

    await service.processJobs();

    expect(runWorkerSpy).toHaveBeenCalledTimes(6);
    expect(runWorkerSpy).not.toHaveBeenCalledWith(
      'CourseEmbeddingIndexerService',
      'run'
    );

    expect(runWorkerSpy).toHaveBeenCalledWith(
      'ProgramsJobService',
      'processPrograms'
    );
    expect(runWorkerSpy).toHaveBeenCalledWith(
      'SessionsJobService',
      'processSessions'
    );

    expect(loggerLogSpy).toHaveBeenCalledWith(
      'Skipping job 7: CourseEmbeddingIndexerService.run because CHATBOT_ENABLED=false'
    );
  });

  it('should not run boot-time jobs outside production', async () => {
    process.env.APP_ENV = 'development';

    const processJobsSpy = jest
      .spyOn(service, 'processJobs')
      .mockResolvedValue(undefined);

    await service.runOnceAfterBoot();

    expect(processJobsSpy).not.toHaveBeenCalled();
  });

  it('should run boot-time jobs in production', async () => {
    process.env.APP_ENV = 'production';

    const processJobsSpy = jest
      .spyOn(service, 'processJobs')
      .mockResolvedValue(undefined);

    await service.runOnceAfterBoot();

    expect(loggerLogSpy).toHaveBeenCalledWith('Boot-time job triggered...');
    expect(processJobsSpy).toHaveBeenCalledTimes(1);
  });

  it('should spawn a worker and resolve when the worker sends a message', async () => {
    runWorkerSpy.mockRestore();

    const promise = service.runWorker('ProgramsJobService', 'processPrograms');

    expect(WorkerMock).toHaveBeenCalledTimes(1);
    expect(fakeWorkers).toHaveLength(1);
    expect(fakeWorkers[0].script).toContain('jobRunner.worker.js');
    expect(fakeWorkers[0].options).toEqual({
      workerData: {
        serviceName: 'ProgramsJobService',
        methodName: 'processPrograms'
      }
    });

    fakeWorkers[0].emit('message', { status: 'ok' });
    fakeWorkers[0].emit('exit', 0);

    await expect(promise).resolves.toEqual({ status: 'ok' });
    expect(loggerVerboseSpy).toHaveBeenCalledWith('Worker message:', {
      status: 'ok'
    });
  });

  it('should reject when the worker emits an Error', async () => {
    runWorkerSpy.mockRestore();

    const promise = service.runWorker('CoursesJobService', 'processCourses');

    fakeWorkers[0].emit('error', new Error('worker failed'));

    await expect(promise).rejects.toThrow('worker failed');
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Worker error:',
      expect.any(Error)
    );
  });

  it('should reject when the worker emits a non-Error value', async () => {
    runWorkerSpy.mockRestore();

    const promise = service.runWorker('CoursesJobService', 'processCourses');

    fakeWorkers[0].emit('error', 'worker failed');

    await expect(promise).rejects.toThrow('worker failed');
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Worker error:',
      'worker failed'
    );
  });

  it('should reject when the worker exits with a non-zero code', async () => {
    runWorkerSpy.mockRestore();

    const promise = service.runWorker('CoursesJobService', 'processCourses');

    fakeWorkers[0].emit('exit', 1);

    await expect(promise).rejects.toThrow('Worker stopped with exit code 1');
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Worker stopped with exit code 1'
    );
  });
});
