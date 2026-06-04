import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { EmbeddingCountDto } from './dtos/embedding-count.dto';
import { EmbeddingViewDto } from './dtos/embedding-view.dto';
import { EmbeddingService } from './embedding.service';

@ApiTags('Embedding View')
@Controller('embedding-view')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Get()
  @ApiOperation({ summary: 'Return all rows from v_courses_for_embedding (one per course-program pair)' })
  @ApiOkResponse({ type: [EmbeddingViewDto] })
  public findAll(): Promise<EmbeddingViewDto[]> {
    return this.embeddingService.findAll();
  }

  @Get('count')
  @ApiOperation({ summary: 'Get the total number of distinct courses in the embedding view' })
  @ApiOkResponse({ type: EmbeddingCountDto })
  public countCourses(): Promise<EmbeddingCountDto> {
    return this.embeddingService.countCourses();
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Return all rows for a given course (one per program it belongs to)' })
  @ApiParam({ name: 'courseId', type: Number, example: 352413 })
  @ApiOkResponse({ type: [EmbeddingViewDto] })
  public findByCourseId(
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<EmbeddingViewDto[]> {
    return this.embeddingService.findByCourseId(courseId);
  }
}
