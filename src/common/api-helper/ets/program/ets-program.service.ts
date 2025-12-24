import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { ETS_API_GET_ALL_PROGRAMS } from '@/common/utils/url/url-constants';
import { extractNumberFromString, stripHtmlTags } from '@/common/utils/stringUtil';

interface IProgramEtsAPI {
  id: number;
  title: string;
  cycle: string;
  code: string;
  credits: string;
  types: number[];
  url: string;
}

export interface IProgramTypeEtsAPI {
  id: number;
  title: string;
}

export type Program = {
  id: number;
  title: string;
  cycle: number;
  code: string;
  credits: string;
  programTypes: {
    connect: { id: number }[];
  };
  url: string;
};

@Injectable()
export class EtsProgramService {
  constructor(private readonly httpService: HttpService) { }

  public async fetchAllProgramsFromEtsAPI(): Promise<{
    types: IProgramTypeEtsAPI[];
    programs: Program[];
  }> {
    const response = await firstValueFrom(
      this.httpService.get(ETS_API_GET_ALL_PROGRAMS),
    );

    const types: IProgramTypeEtsAPI[] = response.data.types;
    const programs: Program[] = response.data.results.map(
      (program: IProgramEtsAPI) => ({
        id: program.id,
        title: stripHtmlTags(program.title),
        cycle: extractNumberFromString(program.cycle),
        code: program.code,
        credits: program.credits,
        programTypes: {
          connect: program.types.map((typeId) => ({ id: typeId })),
        },
        url: program.url,
      }),
    );

    return { types, programs };
  }
}
