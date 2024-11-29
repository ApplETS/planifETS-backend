import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProgramCoursePrerequisite } from '@prisma/client';

import { PrerequisiteService } from './prerequisite.service';
import { PrerequisiteCodeDto } from './prerequisite.types';

@ApiTags('Prerequisites')
@Controller('prerequisites')
export class PrerequisiteController {
  constructor(private readonly prerequisiteService: PrerequisiteService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all prerequisites',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all prerequisites.',
  })
  public async getAllPrerequisites(): Promise<ProgramCoursePrerequisite[]> {
    return this.prerequisiteService.getAllCoursePrerequisites();
  }

  @Get('by-program-course')
  @ApiOperation({
    summary: 'Get prerequisites by course code and program ID',
  })
  @ApiQuery({
    name: 'programId',
    type: Number,
    required: true,
    description: 'ID of the program',
    example: 182848,
  })
  @ApiQuery({
    name: 'courseCode',
    type: String,
    required: true,
    description: 'Code of the course',
    example: 'LOG430',
  })
  @ApiResponse({
    status: 200,
    description: 'List of prerequisite course codes.',
  })
  public async getPrerequisitesByCode(
    @Query('programId', ParseIntPipe) programId: number,
    @Query('courseCode') courseCode: string,
  ): Promise<PrerequisiteCodeDto[]> {
    return this.prerequisiteService.getPrerequisitesByCode(
      courseCode.toUpperCase(),
      programId,
    );
  }
}
