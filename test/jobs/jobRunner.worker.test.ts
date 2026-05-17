describe('jobRunner.worker', () => {
  const flushWorker = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };

  const loadWorker = async ({
    appContext,
    createApplicationContextMock,
    serviceInstance = { run: jest.fn().mockResolvedValue(undefined) },
    workerData = {
      serviceName: 'TestService',
      methodName: 'run',
    },
  }: {
    appContext?: {
      useLogger: jest.Mock;
      get: jest.Mock;
      close: jest.Mock;
    };
    createApplicationContextMock?: jest.Mock;
    serviceInstance?: Record<string, jest.Mock>;
    workerData?: {
      serviceName: string;
      methodName: string;
    };
  }) => {
    jest.resetModules();

    const postMessage = jest.fn();
    const useLogger = jest.fn();
    const close = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockReturnValue(serviceInstance);
    const loggerErrorSpy = jest.fn();
    const loggerDebugSpy = jest.fn();
    const workerLogger = {
      log: jest.fn(),
      error: loggerErrorSpy,
      warn: jest.fn(),
      debug: loggerDebugSpy,
    };
    const nestContextLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    const createAppLoggerFactory = jest
      .fn()
      .mockImplementation((monitoringOrContext: unknown, context?: string) => {
        const effectiveContext = context ?? (monitoringOrContext as string);
        return effectiveContext === 'JobRunnerWorker' ? workerLogger : nestContextLogger;
      });

    const resolvedAppContext = appContext ?? {
      useLogger,
      get,
      close,
    };
    const createApplicationContext = createApplicationContextMock
      ?? jest.fn().mockResolvedValue(resolvedAppContext);

    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);

    class TestService {}

    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        createApplicationContext,
      },
    }));
    jest.doMock('@/common/logger/app-logger-factory', () => ({
      createAppLoggerFactory,
    }));
    jest.doMock('../../src/jobs/jobs.constants', () => ({
      jobWorkerServiceMap: {
        TestService,
      },
    }));
    jest.doMock('../../src/jobs/jobs.module', () => ({
      JobsModule: class JobsModule {},
    }));
    jest.doMock('worker_threads', () => ({
      isMainThread: false,
      parentPort: {
        postMessage,
      },
      workerData,
    }));

    await import('../../src/jobs/workers/jobRunner.worker');
    await flushWorker();

    return {
      close,
      createAppLoggerFactory,
      createApplicationContext,
      exitSpy,
      get,
      loggerDebugSpy,
      loggerErrorSpy,
      postMessage,
      serviceInstance,
      useLogger,
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('logs, reports, and exits when application context bootstrap fails', async () => {
    const bootstrapError = new Error('bootstrap failed');
    const createApplicationContextMock = jest
      .fn()
      .mockRejectedValue(bootstrapError);

    const { createApplicationContext, exitSpy, loggerErrorSpy, postMessage } =
      await loadWorker({ createApplicationContextMock });

    expect(createApplicationContext).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error in JobRunnerWorker: bootstrap failed',
      bootstrapError.stack,
    );
    expect(postMessage).toHaveBeenCalledWith('Error: bootstrap failed');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('posts success, closes the context, and exits cleanly when the job completes', async () => {
    const run = jest.fn().mockResolvedValue(undefined);

    const {
      close,
      createAppLoggerFactory,
      exitSpy,
      get,
      postMessage,
      useLogger,
    } = await loadWorker({
      serviceInstance: { run },
    });

    expect(createAppLoggerFactory).toHaveBeenCalledWith(expect.anything(), 'JobWorkerNestContext');
    expect(useLogger).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith('run completed.');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('wires the monitoring service from app context into the logger factory', async () => {
    const mockMonitoringService = { captureException: jest.fn(), captureLog: jest.fn() };
    const run = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn()
      .mockReturnValueOnce(mockMonitoringService)
      .mockReturnValueOnce({ run });

    const { createAppLoggerFactory } = await loadWorker({
      appContext: {
        useLogger: jest.fn(),
        get,
        close: jest.fn().mockResolvedValue(undefined),
      },
    });

    expect(createAppLoggerFactory).toHaveBeenCalledWith(mockMonitoringService, 'JobWorkerNestContext');
  });

  it('closes the context and reports job execution failures', async () => {
    const jobError = new Error('job failed');
    const run = jest.fn().mockRejectedValue(jobError);

    const { close, exitSpy, loggerErrorSpy, postMessage } = await loadWorker({
      serviceInstance: { run },
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error in JobRunnerWorker: job failed',
      jobError.stack,
    );
    expect(postMessage).toHaveBeenCalledWith('Error: job failed');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('reports cleanup failures when context shutdown throws', async () => {
    const closeError = new Error('close failed');
    const run = jest.fn().mockResolvedValue(undefined);

    const { exitSpy, loggerErrorSpy, postMessage } = await loadWorker({
      appContext: {
        useLogger: jest.fn(),
        get: jest.fn().mockReturnValue({ run }),
        close: jest.fn().mockRejectedValue(closeError),
      },
    });

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error in JobRunnerWorker: close failed',
      closeError.stack,
    );
    expect(postMessage).toHaveBeenCalledWith('Error: close failed');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
