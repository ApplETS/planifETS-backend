// src/jobs/workers/worker-helper.ts
import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';
import { Logger } from '@nestjs/common';

export class WorkerHelper {
  private static readonly logger = new Logger(WorkerHelper.name);

  public static async executeJob(serviceFilePath: string, methodName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: { serviceFilePath, methodName } });

      worker.on('message', (message) => {
        if (message.status === 'success') {
          resolve(message.result);
        } else if (message.status === 'error') {
          this.logger.error(`Worker error in method ${methodName}:`, message.error);
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        this.logger.error(`Worker thread error in method ${methodName}:`, error);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`Worker stopped with exit code ${code}`);
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}

if (!isMainThread) {
  (async () => {
    const { serviceFilePath, methodName } = workerData;
    try {
      const { NestFactory } = await import('@nestjs/core');
      const { AppModule } = await import('../../app.module');

      // Create a NestJS application context
      const app = await NestFactory.createApplicationContext(AppModule);

      // Import the service module dynamically
      const serviceModule = await import(serviceFilePath);
      const ServiceClass = serviceModule.default || Object.values(serviceModule)[0];
      
      // Get an instance of the service from the application context
      const serviceInstance = app.get(ServiceClass);

      // Call the specified method on the service instance
      const result = await serviceInstance[methodName]();
      parentPort?.postMessage({ status: 'success', result });

      // Close the application context
      await app.close();
    } catch (error: any) {
      parentPort?.postMessage({ status: 'error', error: error?.message ?? error });
    }
  })();
}
