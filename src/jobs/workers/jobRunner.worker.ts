import '../../instrument';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { isMainThread, parentPort, workerData } from 'worker_threads';

import { createAppLoggerFactory } from '@/common/logger/app-logger-factory';

import { JobWorkerData, jobWorkerServiceMap } from '../jobs.constants';
import { JobsModule } from '../jobs.module';

interface ServiceInstance {
  [key: string]: () => Promise<void>;
}

(async () => {
  const logger = new Logger('JobRunnerWorker');
  logger.debug('Are we on the main thread?', isMainThread ? 'Yes' : 'No');

  const { serviceName, methodName } = workerData as JobWorkerData;
  const appContext = await NestFactory.createApplicationContext(
    JobsModule,
    {
      logger: false, // this suppresses the default Nest logger since we'll use our custom logger instead
    },
  );
  appContext.useLogger(createAppLoggerFactory('JobWorkerNestContext'));

  try {
    // Get the Service Class from the mapping
    const ServiceClass = jobWorkerServiceMap[serviceName];

    if (!ServiceClass) {
      throw new Error(`Service ${serviceName} not found in service mapping`);
    }

    // Get the service instance using the class reference
    const serviceInstance = appContext.get(ServiceClass) as ServiceInstance;

    if (!serviceInstance || typeof serviceInstance[methodName] !== 'function') {
      throw new Error(
        `Method ${methodName} not found on service ${serviceName}`,
      );
    }

    // Execute the specified method
    await serviceInstance[methodName]();

    parentPort?.postMessage(`${methodName} completed successfully`);

    await appContext.close();
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error in JobRunnerWorker: ${error.message}`, error.stack);
      parentPort?.postMessage(`Error: ${error.message}`);
    } else {
      logger.error(`Error in JobRunnerWorker: ${error}`);
      parentPort?.postMessage(`Error: ${error}`);
    }

    await appContext?.close();
    process.exit(1);
  }
})();
