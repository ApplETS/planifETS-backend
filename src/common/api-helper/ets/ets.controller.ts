import { Controller, Get, Param, Query } from '@nestjs/common';

import { EtsProgramService } from './program/ets-program.service';

@Controller('ets')
export class EtsController {
  constructor(private readonly etsProgramService: EtsProgramService) {}

  @Get('programs')
  public async fetchAllPrograms() {
    return this.etsProgramService.fetchAllPrograms();
  }
}
