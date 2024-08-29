import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  EtsCourseService,
  IEtsCourse,
  IEtsCoursesData,
} from './ets-course.service';

@ApiTags('ÉTS API')
@Controller('ets/courses')
export class EtsCourseController {
  constructor(private readonly etsCourseService: EtsCourseService) {}

  @Get()
  public fetchAllCourses(): Promise<IEtsCoursesData[]> {
    return this.etsCourseService.fetchAllCourses();
  }

  @Get(':id')
  public fetchCoursesById(@Param('id') id: string): Promise<IEtsCourse[]> {
    if (!id) {
      throw new Error('The id parameter is required');
    }

    return this.etsCourseService.fetchCoursesById(id);
  }
}
