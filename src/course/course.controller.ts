import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CourseService } from './course.service';
@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  public getCourse(@Param('id') id: string) {
    //TODO: Change this for int IdDto? (Prisma update uuid to int)
    return this.courseService.getCourse({ id });
  }

  @Get()
  public getAllCourses() {
    return this.courseService.getAllCourses();
  }
}
