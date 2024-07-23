import { Controller, Get, Param } from '@nestjs/common';

import { CourseService } from './course.service';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get(':id')
  public course(@Param('id') id: string) {
    return this.courseService.course({ id });
  }

  @Get()
  public courses() {
    return this.courseService.courses();
  }
}
