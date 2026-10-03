import { join } from 'node:path';
import { isMainThread, Worker } from 'node:worker_threads';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly chatbotEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.chatbotEnabled = this.configService.get<boolean>(
      'chatbot.enabled',
      false
    );
  }

  public isChatbotJob(serviceName: string, methodName: string): boolean {
    return (
      serviceName === 'CourseEmbeddingIndexerService' && methodName === 'run'
    );
  }

  public canRunJob(serviceName: string, methodName: string): boolean {
    if (!this.isChatbotJob(serviceName, methodName)) {
      return true;
    }

    return this.chatbotEnabled;
  }

  public runWorker(serviceName: string, methodName: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const workerScript = join(__dirname, 'workers', 'jobRunner.worker.js');
      const workerData = { serviceName, methodName };

      this.logger.log(`Spawning worker for ${serviceName}.${methodName}`);

      const worker = new Worker(workerScript, { workerData });
      let settled = false;

      worker.on('message', (message) => {
        if (settled) return;
        this.logger.verbose('Worker message:', message);
        if (
          message?.status === 'success' &&
          typeof message.result === 'string'
        ) {
          settled = true;
          resolve(message.result);
        } else if (
          message?.status === 'error' &&
          typeof message.error === 'string'
        ) {
          settled = true;
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        if (settled) return;
        settled = true;
        this.logger.error('Worker error:', error);

        const rejectionError =
          error instanceof Error ? error : new Error(String(error));
        reject(rejectionError);
      });

      worker.on('exit', (code) => {
        if (settled) return;
        settled = true;
        const message =
          code !== 0
            ? `Worker stopped with exit code ${code}`
            : 'Worker exited without a valid result';
        this.logger.error(message);
        reject(new Error(message));
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

  @Cron(CronExpression.EVERY_12_HOURS, { timeZone: 'America/Toronto' })
  public async processJobs(): Promise<void> {
    this.logger.log('Starting sequential job processing...');
    this.logger.debug(
      'Are we on the main thread?',
      isMainThread ? 'Yes' : 'No'
    );

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
        method: 'syncCourseDescriptionsFromEtsWebsite'
      },

      // Creates missing ProgramCourse links and synchronizes CourseInstances.
      // Data source: Planification PDF
      {
        service: 'CourseInstancesJobService',
        method: 'processCourseInstances'
      },

      // Create current Session and Prerequisite entities.
      // Data source: Horaire-cours PDF
      { service: 'SessionsJobService', method: 'processSessions' },

      // Index course embeddings for RAG.
      // Data source: Course data
      { service: 'CourseEmbeddingIndexerService', method: 'run' }
    ];

    for (const [index, job] of jobs.entries()) {
      const { service, method } = job;

      if (!this.canRunJob(service, method)) {
        this.logger.log(
          `Skipping job ${index + 1}: ${service}.${method} because CHATBOT_ENABLED=false`
        );
        continue;
      }

      try {
        this.logger.log(`Starting job ${index + 1}: ${service}.${method}`);
        // Later jobs depend on data produced by earlier jobs.
        const result = await this.runWorker(service, method); // NOSONAR: later jobs depend on data produced by earlier jobs
        this.logger.log(
          `Job ${index + 1} (${service}.${method}) completed : ${JSON.stringify(result)}`
        );
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(
            `Job ${index + 1} (${service}.${method}) failed: ${error.message}`,
            error.stack
          );
        } else {
          this.logger.error(
            `Job ${index + 1} (${service}.${method}) failed: ${error}`
          );
        }
      }
    }

    this.logger.log('Job processing completed.');
  }
}
