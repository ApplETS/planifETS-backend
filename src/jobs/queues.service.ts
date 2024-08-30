import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, QueueEvents } from 'bullmq';

import { QueuesEnum } from './queues.enum';

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(QueuesService.name);

  private programsQueueEvents!: QueueEvents;
  private coursesQueueEvents!: QueueEvents;

  constructor(
    @InjectQueue(QueuesEnum.PROGRAMS) private readonly programsQueue: Queue,
    @InjectQueue(QueuesEnum.COURSES) private readonly coursesQueue: Queue,
  ) {}

  public async onModuleInit() {
    this.programsQueueEvents = new QueueEvents(QueuesEnum.PROGRAMS);
    this.coursesQueueEvents = new QueueEvents(QueuesEnum.COURSES);
  }

  public async onModuleDestroy() {
    this.programsQueueEvents.close();
    this.coursesQueueEvents.close();
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  public async processJobs() {
    this.logger.log('Starting monthly job processing...');
    await this.processPrograms();
  }

  private async processPrograms() {
    const job = await this.programsQueue.add('upsert-programs', {});
    this.logger.log(
      'Programs job added to queue: ' + job.id + ' (' + job.name + ')',
    );
    job.waitUntilFinished(this.programsQueueEvents).then(() => {
      this.processCourses();
    });
  }

  private async processCourses() {
    const job = await this.coursesQueue.add('courses-upsert', {});
    this.logger.log(
      'Courses job added to queue: ' + job.id + ' (' + job.name + ')',
    );

    job
      .waitUntilFinished(this.coursesQueueEvents)
      .then(() => {
        this.logger.log('Courses job finished processing.');
      })
      .catch((err) => {
        this.logger.error('Error processing courses job:', err);
      });
  }
}
