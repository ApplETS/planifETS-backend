import { Controller, Get, Param } from '@nestjs/common';
import { Program as ProgramModel } from '@prisma/client';

import { ProgramService } from './program.service';

@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Get(':id')
  async getProgram(@Param('id') id: string) {
    return this.programService.program({ id });
  }

  @Get()
  async getAllPrograms() {
    return this.programService.programs();
  }
}
