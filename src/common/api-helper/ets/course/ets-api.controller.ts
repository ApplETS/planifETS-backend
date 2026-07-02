import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CourseByIdEtsApiDto } from './dtos/course-by-id-ets-api.dto';
import { EtsApiService, ICourseWithCredits } from './ets-api.service';

@ApiTags('ÉTS API')
@Controller('ets/courses')
export class EtsApiController {
  constructor(private readonly etsApiService: EtsApiService) {}

  @Get()
  public fetchAllCourses(): Promise<ICourseWithCredits[]> {
    return this.etsApiService.fetchAllCoursesWithCredits();
  }

  @Get(':id')
  public fetchCoursesById(
    @Param('id') id: string
  ): Promise<CourseByIdEtsApiDto[]> {
    if (!id) {
      throw new Error('The id parameter is required');
    }

    return this.etsApiService.fetchCoursesById(id);
  }
}
