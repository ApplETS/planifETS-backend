import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Course } from '@prisma/client';

import { CourseService } from './course.service';
@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  public getCourse(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Course | null> {
    return this.courseService.getCourse({ id });
  }

  @Get()
  public getAllCourses() {
    return this.courseService.getAllCourses();
  }
}
