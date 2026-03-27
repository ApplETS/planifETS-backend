import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  DetailedProgramCourseDto,
  ProgramCoursesDto,
  ProgramCoursesResponseDto,
} from './dtos/program-course.dto';
import { ProgramCourseService } from './program-course.service';

@ApiTags('Program courses')
@Controller('program-courses')
export class ProgramCourseController {
  constructor(private readonly programCourseService: ProgramCourseService) { }


  @Get("ids")
  @ApiOperation({ summary: '🟢 Get program courses by course IDs' })
  @ApiQuery({
    name: 'courseIds',
    type: Number,
    isArray: true,
    required: true,
    description:
      'One or more course IDs (e.g. ?courseIds=352377&courseIds=182848)',
  })
  @ApiOkResponse({
    description: 'Returns program courses',
    type: ProgramCoursesResponseDto,
  })
  public async getProgramsCoursesByCourseIds(
    @Query('courseIds') courseIds: string | string[],
  ): Promise<{
    data: ProgramCoursesDto[];
    errors?: { invalidCourseIds?: number[] };
  }> {
    // Convert to array and parse to numbers
    const idsArray = Array.isArray(courseIds)
      ? courseIds.map(id => Number(id))
      : [Number(courseIds)];

    // Validate that all IDs are valid numbers
    if (idsArray.length === 0 || idsArray.some(id => Number.isNaN(id))) {
      throw new HttpException(
        'Course IDs must be valid numbers',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.programCourseService.getProgramsCoursesByCourseIds(
      idsArray,
    );

    return result;
  }

  @Get("programs")
  @ApiOperation({ summary: '🟢 Get program courses by program IDs' })
  @ApiQuery({
    name: 'programIds',
    type: Number,
    isArray: true,
    required: true,
    description:
      'One or more program IDs (e.g. ?programIds=182848&programIds=183562)',
  })
  @ApiOkResponse({
    description: 'Returns program courses',
    type: ProgramCoursesResponseDto,
  })
  public async getProgramsCoursesByPrograms(
    @Query('programIds') programIds: string | string[],
  ): Promise<{
    data: ProgramCoursesDto[];
    errors?: { invalidProgramIds?: number[] };
  }> {
    if (!programIds) {
      throw new HttpException(
        'Program IDs are required to get program courses',
        HttpStatus.BAD_REQUEST,
      );
    }

    const idsArray = Array.isArray(programIds)
      ? programIds.map(id => Number(id))
      : programIds.split(';').filter(Boolean).map(id => Number(id));

    if (idsArray.length === 0 || idsArray.some(id => Number.isNaN(id))) {
      throw new HttpException(
        'Program IDs must be valid numbers',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.programCourseService.getProgramCoursesById(
      idsArray,
    );

    if (!result.data.length) {
      throw new NotFoundException(
        { invalidProgramIds: result.errors?.invalidProgramIds },
        'No programs found for the provided IDs',
      );
    }

    return result;
  }

  @Get('details')
  @ApiOperation({
    summary: '🟢 Get a program course by courseId and programId',
  })
  @ApiQuery({
    name: 'courseId',
    type: Number,
    required: true,
    description: 'Ex: 352377',
  })
  @ApiQuery({
    name: 'programId',
    type: Number,
    required: true,
    description: 'Ex: 182848',
  })
  @ApiOkResponse({
    description: 'Returns detailed program course information',
    type: DetailedProgramCourseDto,
  })
  public async getDetailedProgramCourse(
    @Query('courseId', ParseIntPipe) courseId: number,
    @Query('programId', ParseIntPipe) programId: number,
  ) {
    if (!courseId || !programId) {
      throw new HttpException(
        'Both courseId and programId are required.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.programCourseService.getProgramCourse(
      Number(courseId),
      programId,
    );
    if (!result) {
      throw new NotFoundException(
        `No program-course found for courseId=${courseId} in programId=${programId}`,
      );
    }
    return result;
  }
}
