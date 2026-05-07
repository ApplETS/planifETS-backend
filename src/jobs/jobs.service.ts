import { join } from 'node:path';
import { isMainThread, Worker } from 'node:worker_threads';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  public runWorker<T>(serviceName: string, methodName: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const workerScript = join(__dirname, 'workers', 'jobRunner.worker.js');
      const workerData = { serviceName, methodName };

      this.logger.log(`Spawning worker for ${serviceName}.${methodName}`);

      const worker = new Worker(workerScript, { workerData });

      worker.on('message', (message) => {
        this.logger.verbose('Worker message:', message);
        resolve(message);
      });

      worker.on('error', (error) => {
        this.logger.error('Worker error:', error);

        const rejectionError =
          error instanceof Error ? error : new Error(String(error));
        reject(rejectionError);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`Worker stopped with exit code ${code}`);
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  @Timeout(600_000) // run 10 minutes after boot
  public async runOnceAfterBoot() {
    if (process.env.APP_ENV !== 'production') {
      return;
    }

    this.logger.log('Boot-time job triggered...');
    await this.processJobs();
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, { timeZone: 'America/Toronto' })
  public async processJobs(): Promise<void> {
    this.logger.log('Starting sequential job processing...');
    this.logger.debug('Are we on the main thread?', isMainThread ? 'Yes' : 'No');

    const jobs = [
      // Creates and updates Programs and ProgramTypes entities.
      // Data source: ETS API
      { service: 'ProgramsJobService', method: 'processPrograms' },

      // Creates and updates Courses entities.
      // Data source: ETS API
      { service: 'CoursesJobService', method: 'processCourses' },

      // Enriches Course descriptions with website content.
      // Data source: ETS website
      {
        service: 'CoursesJobService',
        method: 'syncCourseDescriptionsFromEtsWebsite',
      },

      //Creates and updates Course instance entities.
      // Data source: Planification PDF
      {
        service: 'CourseInstancesJobService',
        method: 'processCourseInstances',
      },

      // Creates and updates ProgramCourse entities.
      // Data source: Cheminot (Cheminements.txt)
      {
        service: 'CoursesJobService',
        method: 'syncCourseDetailsWithCheminotData',
      },

      // Create current Session and Prerequisite entities.
      // Data source: Horaire-cours PDF
      { service: 'SessionsJobService', method: 'processSessions' },
    ];

    for (const [index, job] of jobs.entries()) {
      const { service, method } = job;
      this.logger.log(`Starting job ${index + 1}: ${service}.${method}`);

      try {
        const result = await this.runWorker(service, method);
        this.logger.log(
          `Job ${index + 1} (${service}.${method}) completed : ${JSON.stringify(result)}`,
        );
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(
            `Job ${index + 1} (${service}.${method}) failed: ${error.message}`,
            error.stack,
          );
        } else {
          this.logger.error(
            `Job ${index + 1} (${service}.${method}) failed: ${error}`,
          );
        }
      }
    }

    this.logger.log('Job processing completed.');
  }
}
