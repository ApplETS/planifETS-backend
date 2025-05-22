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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ProgramCoursesDto } from './dtos/program-course.dto';
import { ProgramCourseService } from './program-course.service';

@ApiTags('Program courses')
@Controller('program-courses')
export class ProgramCourseController {
  constructor(private readonly programCourseService: ProgramCourseService) {}

  @Get()
  @ApiOperation({ summary: '🟢 Get detailed program courses by program codes' })
  @ApiQuery({
    name: 'programCodes',
    type: String,
    isArray: true,
    required: true,
    description:
      'One or more program codes (e.g. ?programCodes=7084&programCodes="1822, 1560")',
  })
  public async getProgramsCoursesDetailedByCode(
    @Query('programCodes', new ParseArrayPipe({ items: String }))
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
        'Program codes are required to get detailed program courses',
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

  @Get('program-course')
  @ApiOperation({
    summary: '🟢 Get a program course by courseId and programCode',
    description: 'Ex: ?courseId=352377&programCode=7084',
  })
  @ApiQuery({ name: 'courseId', type: Number, required: true })
  @ApiQuery({ name: 'programCode', type: String, required: true })
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
    const result = await this.programCourseService.getDetailedProgramCourse(
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
