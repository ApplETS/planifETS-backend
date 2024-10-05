import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EtsProgramService } from '../../common/api-helper/ets/program/ets-program.service';
import { ProgramService } from '../../program/program.service';
import { QueuesEnum } from '../queues.enum';

@Processor(QueuesEnum.PROGRAMS)
export class ProgramsProcessor extends WorkerHost {
  private readonly logger = new Logger(ProgramsProcessor.name);

  constructor(
    private readonly etsProgramService: EtsProgramService,
    private readonly programService: ProgramService,
  ) {
    super();
  }

  public async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'upsert-programs':
        await this.processPrograms(job);
        break;
      default:
        this.logger.error('Unknown job name: ' + job.name);
    }
  }

  private async processPrograms(job: Job): Promise<void> {
    this.logger.log('Processing programs...');

    try {
      const { programs, types } =
        await this.etsProgramService.fetchAllProgramsFromEtsAPI();

      const programsLength = programs.length;
      const typesLength = types.length;

      if (!programsLength || !typesLength) {
        this.logger.error('No programs or types fetched.');

        throw new Error('No programs or types fetched.');
      }

      this.logger.log(
        `${typesLength} types of programs and ${programsLength} programs fetched.`,
      );

      await this.programService.createProgramTypes(types);

      job.updateProgress(50);

      await this.programService.upsertPrograms(
        programs.map((program) => ({
          ...program,
        })),
      );

      job.updateProgress(100);

      job.updateData({
        processed: true,
        programs: programsLength,
        types: typesLength,
      });
    } catch (error: unknown) {
      this.logger.error('Error processing programs: ', error);
      throw error;
    }
  }
}
