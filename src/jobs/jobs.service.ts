import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { join } from 'path';
import { isMainThread, Worker } from 'worker_threads';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  private checkMainThread() {
    this.logger.debug(
      'Are we on the main thread?',
      isMainThread ? 'Yes' : 'No',
    );
  }

  private runWorker<T>(serviceName: string, methodName: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const workerScript = join(__dirname, 'workers', 'jobRunner.worker.js');
      const workerData = { serviceName, methodName };
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

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  public async processJobs(): Promise<void> {
    this.logger.log('Starting sequential job processing...');
    this.checkMainThread();

    const jobs = [
      // Creates and updates Programs and ProgramTypes entities.
      // Data source: ETS API
      { service: 'ProgramsJobService', method: 'processPrograms' },

      // Creates and updates Courses entities.
      // Data source: ETS API
      { service: 'CoursesJobService', method: 'processCourses' },

      //Creates and updates Course instance entities.
      // Data source: Planification PDF

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
          `Job ${index + 1} (${service}.${method}) completed successfully: ${JSON.stringify(result)}`,
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
