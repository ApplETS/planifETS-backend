import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CourseService } from './course.service';
import { CourseDto } from './dtos/course.dto';
import { SearchCoursesDto } from './dtos/search-course.dto';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  @Get()
  @ApiOkResponse({
    description: 'Returns all courses',
    type: [CourseDto],
  })
  public getAllCourses(): Promise<CourseDto[]> {
    return this.courseService.getAllCourses();
  }

  @Get('search')
  @ApiOperation({ summary: '🟢 Search courses by query string (query = either code or title)' })
  @ApiOkResponse({
    description: 'Returns paginated search results with courses, total count, and hasMore flag (ordererd by code, then title)',
    type: SearchCoursesDto,
  })

  @ApiQuery({
    name: 'query',
    type: String,
    required: false,
    description: 'Search query. Leave empty to return all courses (paginated). Ex: LOG',
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
    @Query('programCodes') programCodesRaw?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<SearchCoursesDto> {
    // Parse programCodes manually to avoid ParseArrayPipe issues with optional params
    const programCodes = programCodesRaw
      ? programCodesRaw.split(';').filter(code => code.trim())
      : undefined;

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

    return this.courseService.searchCourses(
      query || '', // Pass empty string if query is undefined/null
      programCodes,
      parsedLimit,
      parsedOffset,
    );
  }



  @Get('codes')
  @ApiOkResponse({ type: [CourseDto] })
  @ApiQuery({
    name: 'codes',
    type: String,
    required: true,
    isArray: true,
    description: 'codes=LOG210&codes=LOG430 or codes=LOG210;LOG430',
  })
  public getCoursesByCodes(@Query('codes') codesRaw: string | string[]) {
    let codes: string[] = [];

    if (Array.isArray(codesRaw)) {
      // If it's already an array (multiple query params), use it directly
      codes = codesRaw.filter(code => code?.trim());
    } else if (typeof codesRaw === 'string') {
      // If it's a string, split by semicolon
      codes = codesRaw.split(';').filter(code => code?.trim());
    }

    return this.courseService.getCoursesByCodes(codes);
  }

  @Get(':id')
  @ApiOkResponse({ type: CourseDto })
  public getCourse(@Param('id', ParseIntPipe) id: number) {
    return this.courseService.getCourse({ id });
  }


}
