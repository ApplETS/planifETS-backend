import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ETS_API_GET_ALL_PROGRAMS } from 'src/common/constants/url';

type Program = {
  id: number;
  title: string;
  cycle: string;
  code: string;
  credits: string;
  types: number[];
  url: string;
};

interface ProgramType {
  id: number;
  title: string;
}
@Injectable()
export class EtsProgramService {
  constructor(private readonly httpService: HttpService) {}

  public async getAllPrograms(): Promise<{
    types: ProgramType[];
    programs: Program[];
  }> {
    const response = await firstValueFrom(
      this.httpService.get(ETS_API_GET_ALL_PROGRAMS),
    );

    const types: ProgramType[] = response.data.types;
    const programs: Program[] = response.data.results.map(
      (program: Program) => ({
        id: program.id,
        title: program.title,
        cycle: program.cycle,
        code: program.code,
        credits: program.credits,
        types: program.types,
        url: program.url,
      }),
    );

    return { types, programs };
  }
}
