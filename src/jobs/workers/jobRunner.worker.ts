import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { isMainThread, parentPort, workerData } from 'worker_threads';

import { AppModule } from '../../app.module';
import { CoursesJobService } from './courses.worker';
import { ProgramsJobService } from './programs.worker';

const serviceMapping = {
  ProgramsJobService,
  CoursesJobService,
};

interface WorkerData {
  serviceName: keyof typeof serviceMapping;
  methodName: string;
}

interface ServiceInstance {
  [key: string]: () => Promise<void>;
}

(async () => {
  const logger = new Logger('JobRunnerWorker');
  logger.debug('Are we on the main thread?', isMainThread ? 'Yes' : 'No');

  const { serviceName, methodName } = workerData as WorkerData;
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the Service Class from the mapping
    const ServiceClass = serviceMapping[serviceName];

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
