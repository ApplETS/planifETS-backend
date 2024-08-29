import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { ETS_API_GET_ALL_PROGRAMS } from '../../../constants/url';

interface ProgramETSAPI {
  id: number;
  title: string;
  cycle: string;
  code: string;
  credits: string;
  types: number[];
  url: string;
}

export type Program = {
  id: number;
  title: string;
  cycle: string;
  code: string;
  credits: string;
  programTypes: { id: number }[];
  url: string;
};

export interface ProgramType {
  id: number;
  title: string;
}

@Injectable()
export class EtsProgramService {
  constructor(private readonly httpService: HttpService) {}

  public async fetchAllPrograms(): Promise<{
    types: ProgramType[];
    programs: Program[];
  }> {
    const response = await firstValueFrom(
      this.httpService.get(ETS_API_GET_ALL_PROGRAMS),
    );

    const types: ProgramType[] = response.data.types;
    const programs: Program[] = response.data.results.map(
      (program: ProgramETSAPI) => ({
        id: program.id,
        title: program.title,
        cycle: program.cycle,
        code: program.code,
        credits: program.credits,
        programTypes: program.types.map((typeId) => ({ id: typeId })),
        url: program.url,
      }),
    );

    return { types, programs };
  }
}
