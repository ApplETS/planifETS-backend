import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Program } from '@prisma/client';

import { IdDto } from '@/common/exceptions/dtos/id.dto';

import { ProgramDto, ProgramListDto } from './dtos/program.dto';
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

  @Get('list/course/:courseId')
  @ApiOperation({ summary: 'Get programs list containing the course' })
  @ApiParam({
    name: 'courseId',
    type: Number,
    required: true,
    example: 352405,
    description: 'The course ID to search for',
  })
  @ApiOkResponse({
    description: 'Returns programs list (program id, code, title)',
    type: [ProgramListDto],
  })
  public async getProgramsListByCourseId(@Param('courseId') courseId: string) {
    const id = Number(courseId);
    if (Number.isNaN(id)) {
      throw new HttpException(
        'Course ID must be a valid number',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.programService.getProgramsListByCourseId(id);
  }
}
