import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CourseByIdEtsApiDto } from './dtos/course-by-id-ets-api.dto';
import { EtsCourseService, ICourseWithCredits } from './ets-course.service';

@ApiTags('ÉTS API')
@Controller('ets/courses')
export class EtsCourseController {
  constructor(private readonly etsCourseService: EtsCourseService) {}

  @Get()
  public fetchAllCourses(): Promise<ICourseWithCredits[]> {
    return this.etsCourseService.fetchAllCoursesWithCredits();
  }

  @Get(':id')
  public fetchCoursesById(@Param('id') id: string): Promise<CourseByIdEtsApiDto[]> {
    if (!id) {
      throw new Error('The id parameter is required');
    }

    return this.etsCourseService.fetchCoursesById(id);
  }
}
