import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EtsProgramService } from '../../common/api-helper/ets/program/ets-program.service';
import { ProgramService } from '../../program/program.service';
import { QueuesEnum } from '../queues.enum';

@Processor(QueuesEnum.PROGRAMS)
export class ProgramsProcessor extends WorkerHost {
  private logger = new Logger(ProgramsProcessor.name);

  constructor(
    private readonly etsProgramService: EtsProgramService,
    private readonly programService: ProgramService,
  ) {
    super();
  }

  public async process(job: Job): Promise<void> {
    this.logger.log('Processing programs...');

    try {
      const { programs, types } =
        await this.etsProgramService.fetchAllProgramsFromEtsAPI();

      if (!programs.length || !types.length) {
        this.logger.error('No programs or types fetched.');

        throw new Error('No programs or types fetched.');
      }

      this.logger.log(
        `${types.length} types of programs and ${programs.length} programs fetched.`,
      );

      await this.programService.createProgramTypes(types);

      job.updateProgress(50);

      await this.programService.upsertPrograms(
        programs.map((program) => ({
          ...program,
        })),
      );

      await job.updateData({ processed: true, programs, types });
    } catch (error: unknown) {
      this.logger.error('Error processing programs: ', error);
      throw error;
    }
  }
}
