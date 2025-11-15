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

  @Get()
  @ApiOperation({ summary: '🟢 Get program courses by program codes or IDs' })
  @ApiQuery({
    name: 'programCodes',
    type: String,
    isArray: true,
    required: false,
    description:
      'One or more program codes (e.g. ?programCodes=7084&programCodes=1822)',
  })
  @ApiQuery({
    name: 'programIds',
    type: Number,
    isArray: true,
    required: false,
    description:
      'One or more program IDs (e.g. ?programIds=182848&programIds=183562)',
  })
  @ApiOkResponse({
    description: 'Returns program courses',
    type: ProgramCoursesResponseDto,
  })
  public async getProgramsCoursesDetailed(
    @Query('programCodes') programCodes?: string | string[],
    @Query('programIds') programIds?: string | string[],
  ): Promise<{
    data: ProgramCoursesDto[];
    errors?: { invalidProgramCodes?: string[]; invalidProgramIds?: number[] };
  }> {
    // Check if both parameters are provided
    if (programCodes && programIds) {
      throw new HttpException(
        'Please provide either programCodes or programIds, not both',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if neither parameter is provided
    if (!programCodes && !programIds) {
      throw new HttpException(
        'Either programCodes or programIds is required to get program courses',
        HttpStatus.BAD_REQUEST,
      );
    }

    let result: {
      data: ProgramCoursesDto[];
      errors?: { invalidProgramCodes?: string[]; invalidProgramIds?: number[] };
    };

    // Handle programCodes
    if (programCodes) {
      const codesArray = Array.isArray(programCodes)
        ? programCodes
        : programCodes.split(';').filter(Boolean);

      if (codesArray.length === 0) {
        throw new HttpException(
          'Program codes array cannot be empty',
          HttpStatus.BAD_REQUEST,
        );
      }

      result = await this.programCourseService.getProgramCoursesDetailedByCode(
        codesArray,
      );

      if (!result.data.length) {
        throw new NotFoundException(
          { invalidProgramCodes: result.errors?.invalidProgramCodes },
          'No programs found for the provided codes',
        );
      }
    }
    // Handle programIds
    else {
      const idsArray = Array.isArray(programIds)
        ? programIds.map(id => Number(id))
        : programIds!.split(';').filter(Boolean).map(id => Number(id));

      if (idsArray.length === 0 || idsArray.some(id => isNaN(id))) {
        throw new HttpException(
          'Program IDs must be valid numbers',
          HttpStatus.BAD_REQUEST,
        );
      }

      result = await this.programCourseService.getProgramCoursesDetailedById(
        idsArray,
      );

      if (!result.data.length) {
        throw new NotFoundException(
          { invalidProgramIds: result.errors?.invalidProgramIds },
          'No programs found for the provided IDs',
        );
      }
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
