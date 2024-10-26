import { Injectable, Logger } from '@nestjs/common';
import { EtsProgramService } from '../../common/api-helper/ets/program/ets-program.service';
import { ProgramService } from '../../program/program.service';

@Injectable()
export class ProgramsJobService {
  private readonly logger = new Logger(ProgramsJobService.name);

  constructor(
    private readonly etsProgramService: EtsProgramService,
    private readonly programService: ProgramService,
  ) {}

  public async processPrograms(): Promise<void> {
    this.logger.log('Processing programs...');
    const { programs, types } =
      await this.etsProgramService.fetchAllProgramsFromEtsAPI();

    if (!programs.length || !types.length) {
      throw new Error('No programs or types fetched.');
    }

    this.logger.log(
      `${types.length} types of programs and ${programs.length} programs fetched.`,
    );
    await this.programService.createProgramTypes(types);
    await this.programService.upsertPrograms(programs);
  }
}
