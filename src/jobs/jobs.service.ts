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
    this.logger.log('Starting job processing...');
    this.checkMainThread();

    try {
      await Promise.all([
        // this.runWorker('ProgramsJobService', 'processPrograms'), //FIXME: Uncomment this line later
        // this.runWorker('CoursesJobService', 'processCourses'),
        // this.runWorker(
        //   'CoursesJobService',
        //   'syncCourseDetailsWithCheminotData',
        // ),
        this.runWorker('SessionsJobService', 'processSessions'),
      ]);
      this.logger.log('All jobs completed successfully!');
    } catch (error) {
      this.logger.error('Job processing error:', error);
    }
  }
}
