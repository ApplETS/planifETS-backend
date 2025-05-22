import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Program } from '@prisma/client';

import { IdDto } from '../common/exceptions/dtos/id.dto';
import { ProgramService } from './program.service';

@ApiTags('Programs')
@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Get(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  public async getProgram(@Param() { id }: IdDto): Promise<Program | null> {
    return this.programService.getProgram({ id });
  }

  @Get()
  @ApiOperation({
    summary: '🟢 Get All Programs',
  })
  public async getAllPrograms(): Promise<Program[] | null> {
    return this.programService.getAllPrograms();
  }
}
