import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { EtsProgramService } from './ets-program.service';

@ApiTags('ÉTS API')
@Controller('ets/programs')
export class EtsProgramController {
  constructor(private readonly etsProgramService: EtsProgramService) {}

  @Get()
  public async fetchAllPrograms() {
    return this.etsProgramService.fetchAllPrograms();
  }
}
