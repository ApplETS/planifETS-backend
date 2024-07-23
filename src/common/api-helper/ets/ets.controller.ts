import { Controller, Get, Param } from '@nestjs/common';

import {
  EtsCourseService,
  IEtsCourse,
  IEtsCoursesData,
} from './course/ets-course.service';
import { EtsProgramService } from './program/ets-program.service';

@Controller('ets')
export class EtsController {
  constructor(
    private readonly etsCourseService: EtsCourseService,
    private readonly etsProgramService: EtsProgramService,
  ) {}

  @Get('courses')
  public fetchAllCourses(): Promise<IEtsCoursesData[]> {
    return this.etsCourseService.fetchAllCourses();
  }

  @Get('courses/:id')
  public fetchCoursesById(@Param('id') id: string): Promise<IEtsCourse[]> {
    if (!id) {
      throw new Error('The id parameter is required');
    }

    return this.etsCourseService.fetchCoursesById('349682,349710');
  }

  @Get('programs')
  public async fetchAllPrograms() {
    return this.etsProgramService.fetchAllPrograms();
  }
}
