import { NestFactory } from '@nestjs/core';
import { isMainThread, parentPort, workerData } from 'worker_threads';

import { createAppLoggerFactory } from '@/common/logger/app-logger-factory';
import { PosthogMonitoringService } from '@/monitoring/posthog-monitoring.service';

import { JobWorkerData, jobWorkerServiceMap } from '../jobs.constants';
import { JobsModule } from '../jobs.module';

interface ServiceInstance {
  [key: string]: () => Promise<void>;
}

async function runJobWorker(
  serviceName: JobWorkerData['serviceName'],
  methodName: JobWorkerData['methodName'],
) {
  const appContext = await NestFactory.createApplicationContext(
    JobsModule,
    {
      logger: false, // this suppresses the default Nest logger since we'll use our custom logger instead
    },
  );

  try {
    const monitoring = appContext.get(PosthogMonitoringService);
    appContext.useLogger(createAppLoggerFactory(monitoring, 'JobWorkerNestContext'));

    const ServiceClass = jobWorkerServiceMap[serviceName];

    if (!ServiceClass) {
      throw new Error(`Service ${serviceName} not found in service mapping`);
    }

    const serviceInstance = appContext.get(ServiceClass) as ServiceInstance;

    if (
      !serviceInstance ||
      typeof serviceInstance[methodName] !== 'function'
    ) {
      throw new Error(
        `Method ${methodName} not found on service ${serviceName}`,
      );
    }

    // Execute the specified method
    await serviceInstance[methodName]();
  } finally {
    await appContext.close();
  }
}

// Worker logic
(async () => {
  const logger = createAppLoggerFactory(undefined, 'JobRunnerWorker');
  logger.debug('Are we on the main thread?', isMainThread ? 'Yes' : 'No');

  const { serviceName, methodName } = workerData as JobWorkerData;
  let exitCode = 0;

  try {
    await runJobWorker(serviceName, methodName);

    parentPort?.postMessage(`${methodName} completed.`);
  } catch (error) {
    exitCode = 1;

    if (error instanceof Error) {
      logger.error(`Error in JobRunnerWorker: ${error.message}`, error.stack);
      parentPort?.postMessage(`Error: ${error.message}`);
    } else {
      logger.error(`Error in JobRunnerWorker: ${error}`);
      parentPort?.postMessage(`Error: ${error}`);
    }
  }

  process.exit(exitCode);
})();
