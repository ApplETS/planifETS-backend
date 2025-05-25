import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CourseService } from './course.service';
import { SearchCoursesDto } from './dtos/search-course.dto';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('search')
  @ApiOperation({ summary: '🟢 Search courses by query string' })
  @ApiQuery({
    name: 'query',
    type: String,
    required: true,
    description: 'Ex: LOG',
  })
  @ApiQuery({
    name: 'programCodes',
    type: String,
    required: false,
    description: 'Ex: 7084;1822;1560',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Default: 20',
  })
  @ApiQuery({
    name: 'offset',
    type: Number,
    required: false,
    description: 'Default: 0',
  })
  public async searchCourses(
    @Query('query') query: string,
    @Query(
      'programCodes',
      new ParseArrayPipe({
        items: String,
        optional: true,
        separator: ';',
      }),
    )
    programCodes?: string[],
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SearchCoursesDto> {
    if (!query) {
      throw new HttpException(
        'Query parameter is required to search courses',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

    return this.courseService.searchCourses(
      query,
      programCodes,
      parsedLimit,
      parsedOffset,
    );
  }

  @Get()
  public getAllCourses() {
    return this.courseService.getAllCourses();
  }

  @Get(':id')
  public getCourse(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.getCourse({ id });
  }

  @Get('codes')
  public getCoursesByCodes(@Query('codes') codes: string[]) {
    return this.courseService.getCoursesByCodes(codes);
  }
}
