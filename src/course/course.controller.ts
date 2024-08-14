import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { IdDto } from '../common/exceptions/dtos/id.dto';
import { CourseService } from './course.service';
@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  public getCourse(@Param('id') { id }: IdDto) {
    return this.courseService.getCourse({ id });
  }

  @Get()
  public getAllCourses() {
    return this.courseService.getAllCourses();
  }
}
