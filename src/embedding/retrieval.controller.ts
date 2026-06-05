import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CourseRetrieverService } from './course-retriever.service';
import { CourseResultDto, RetrieveCoursesDto } from './dtos/retrieve-courses.dto';

@ApiTags('Retrieval')
@Controller('retrieval')
export class RetrievalController {
  constructor(private readonly retrieverService: CourseRetrieverService) {}

  @Post('courses')
  @HttpCode(200)
  @ApiOperation({ summary: 'Semantic search — embed query and return top-K courses from Qdrant' })
  @ApiOkResponse({ type: [CourseResultDto] })
  public retrieveCourses(@Body() body: RetrieveCoursesDto): Promise<CourseResultDto[]> {
    return this.retrieverService.retrieveCourses(body.query, body.context);
  }
}
