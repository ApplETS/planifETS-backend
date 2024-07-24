import { Controller, Get, Param } from '@nestjs/common';

import { CourseService } from './course.service';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  public getCourse(@Param('id') id: string) {
    return this.courseService.getCourse({ id });
  }

  @Get()
  public getAllCourses() {
    return this.courseService.getAllCourses();
  }
}
