import { join } from 'node:path';
import { isMainThread, Worker } from 'node:worker_threads';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry, Timeout } from '@nestjs/schedule';
import { CronJob } from 'cron';

const DEFAULT_JOBS_CRON = '0 */12 * * *'; // every 12 hours

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  public onModuleInit() {
    const cronExpression = process.env.JOBS_CRON_SCHEDULE || DEFAULT_JOBS_CRON;
    this.logger.log(`Registering jobs cron: ${cronExpression}`);

    const job = new CronJob(
      cronExpression,
      () => this.processJobs(),
      null,
      false,
      'America/Toronto',
    );

    this.schedulerRegistry.addCronJob('data-aggregation', job);
    job.start();
  }

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

      try {
        this.logger.log(`Starting job ${index + 1}: ${service}.${method}`);
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
