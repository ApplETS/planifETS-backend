import { Controller, Get, Param } from '@nestjs/common';
import { ProgramService } from './program.service';
import { Program as ProgramModel } from '@prisma/client';

@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Get(':id')
  async getProgram(@Param('id') id: string) {
    return this.programService.getProgram({ id: id });
  }

  @Get()
  async getAllPrograms() {
    return this.programService.getAllPrograms();
  }
}
