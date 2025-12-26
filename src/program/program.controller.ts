import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Program } from '@prisma/client';

import { IdDto } from '../common/exceptions/dtos/id.dto';
import { ProgramDto } from './dtos/program.dto';
import { ProgramService } from './program.service';

@ApiTags('Programs')
@Controller('programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) { }

  @Get(':id')
  @ApiOperation({
    summary: '🟢 Get Program by ID',
  })
  @ApiOkResponse({
    type: ProgramDto,
    isArray: false,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  public async getProgram(@Param() { id }: IdDto): Promise<Program | null> {
    return this.programService.getProgram({ id });
  }

  @Get()
  @ApiOperation({
    summary: '🟢 Get All Programs',
  })
  @ApiOkResponse({
    type: ProgramDto,
    isArray: true,
  })
  public async getAllPrograms(): Promise<ProgramDto[] | null> {
    return this.programService.getAllActivePrograms();
  }
}
