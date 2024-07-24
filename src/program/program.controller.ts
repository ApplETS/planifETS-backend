import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Program } from '@prisma/client';

import { UuidDto } from '../common/exceptions/dtos/uuid.dto';
import { ProgramService } from './program.service';

@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Get(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  public async getProgram(@Param() { id }: UuidDto): Promise<Program | null> {
    return this.programService.getProgram({ id });
  }

  @Get()
  public async getAllPrograms(): Promise<Program[] | null> {
    return this.programService.getAllPrograms();
  }
}
