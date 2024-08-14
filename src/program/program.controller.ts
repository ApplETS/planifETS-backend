import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Program } from '@prisma/client';

import { UuidDto } from '../common/exceptions/dtos/uuid.dto';
import { ProgramService } from './program.service';

@ApiTags('Programs')
@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Get(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  //TODO: Change this to use IdDto when Prisma is updated (uuid to id)
  public async getProgram(@Param() { id }: UuidDto): Promise<Program | null> {
    return this.programService.getProgram({ id });
  }

  @Get()
  public async getAllPrograms(): Promise<Program[] | null> {
    return this.programService.getAllPrograms();
  }
}
