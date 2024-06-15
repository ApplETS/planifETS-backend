import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  public getCourse(@Param('id') id: string) {
    return this.courseService.course({ id });
  }

  @Get()
  public getCourses() {
    return this.courseService.courses();
  }
}
