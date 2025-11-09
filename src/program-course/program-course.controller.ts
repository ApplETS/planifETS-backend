import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  ParseArrayPipe,
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
  @ApiOperation({ summary: '🟢 Get program courses by program codes' })
  @ApiQuery({
    name: 'programCodes',
    type: String,
    isArray: true,
    required: true,
    description:
      'One or more program codes (e.g. ?programCodes=7084&programCodes="1822;1560;7084")',
  })
  @ApiOkResponse({
    description: 'Returns program courses',
    type: ProgramCoursesResponseDto,
  })
  public async getProgramsCoursesDetailedByCode(
    @Query(
      'programCodes',
      new ParseArrayPipe({
        items: String,
        separator: ';',
      }),
    )
    programCodes: string[],
  ): Promise<{
    data: ProgramCoursesDto[];
    errors?: { invalidProgramCodes: string[] };
  }> {
    if (
      !programCodes ||
      !Array.isArray(programCodes) ||
      programCodes.length === 0
    ) {
      throw new HttpException(
        'Program codes are required to get program courses',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result =
      await this.programCourseService.getProgramsCoursesDetailedByCode(
        programCodes,
      );

    if (!result.data.length) {
      throw new NotFoundException(
        { invalidProgramCodes: result.errors?.invalidProgramCodes },
        'No programs found for the provided codes',
      );
    }

    return result;
  }

  @Get('details')
  @ApiOperation({
    summary: '🟢 Get a program course by courseId and programCode',
  })
  @ApiQuery({
    name: 'courseId',
    type: Number,
    required: true,
    description: 'Ex: 352377',
  })
  @ApiQuery({
    name: 'programCode',
    type: String,
    required: true,
    description: 'Ex: 7084',
  })
  @ApiOkResponse({
    description: 'Returns detailed program course information',
    type: DetailedProgramCourseDto,
  })
  public async getDetailedProgramCourse(
    @Query('courseId', ParseIntPipe) courseId: number,
    @Query('programCode') programCode: string,
  ) {
    if (!courseId || !programCode) {
      throw new HttpException(
        'Both courseId and programCode are required.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.programCourseService.getProgramCourse(
      Number(courseId),
      programCode,
    );
    if (!result) {
      throw new NotFoundException(
        `No program-course found for courseId=${courseId} in programCode=${programCode}`,
      );
    }
    return result;
  }
}
