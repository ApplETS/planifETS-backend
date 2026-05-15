import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import { extractNumberFromString, stripHtmlTags } from '@/common/utils/stringUtil';
import { ETS_API_GET_ALL_PROGRAMS } from '@/common/utils/url/url-constants';

import { ProgramEtsApiDto } from './dtos/program-ets-api.dto';
import { ProgramIndexResponseDto } from './dtos/program-index-response.dto';
import { ProgramTypeEtsApiDto } from './dtos/program-type-ets-api.dto';

export type Program = {
  id: number;
  title: string;
  cycle: number;
  code: string | null;
  credits: string | null;
  programTypes: {
    connect: { id: number }[];
  };
  url: string;
};

@Injectable()
export class EtsProgramService {
  constructor(private readonly httpService: HttpService) { }

  public async fetchAllProgramsFromEtsAPI(): Promise<{
    types: ProgramTypeEtsApiDto[];
    programs: Program[];
  }> {
    const response = await firstValueFrom(
      this.httpService.get(ETS_API_GET_ALL_PROGRAMS),
    );

    const raw = response.data as ProgramIndexResponseDto;
    const types: ProgramTypeEtsApiDto[] = raw.types;
    const programs: Program[] = raw.results.map(
      (program: ProgramEtsApiDto) => ({
        id: program.id,
        title: stripHtmlTags(program.title),
        cycle: extractNumberFromString(program.cycle),
        code: program.code,
        credits: typeof program.credits === 'string' ? program.credits : null,
        programTypes: {
          connect: program.types.map((typeId) => ({ id: typeId })),
        },
        url: program.url,
      }),
    );

    return { types, programs };
  }
}
