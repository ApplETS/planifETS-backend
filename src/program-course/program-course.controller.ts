import { Controller, Get, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ProgramCourseService } from './program-course.service';

@ApiTags('Programs courses')
@Controller('program-courses')
export class ProgramCourseController {
  constructor(private readonly programCourseService: ProgramCourseService) {}

  @Get('detailed')
  @ApiOperation({
    summary: 'Get courses for multiple programs with course details',
  })
  @ApiQuery({
    name: 'programCodes',
    type: [String],
    isArray: true,
    required: true,
    description: 'Array of program codes',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns courses grouped by programs with their details',
  })
  public async getProgramsCoursesWithDetailsByCode(
    @Query(
      'programCodes',
      new ParseArrayPipe({ items: String, separator: ',' }),
    )
    programCodes: string[],
  ) {
    return this.programCourseService.getProgramsCoursesWithDetailsByCode(
      programCodes,
    );
  }
}
