import { Controller, Get, Param } from '@nestjs/common';

import { CoursePrerequisiteService } from './course-prerequisite.service';

@Controller('course-prerequisite')
export class CoursePrerequisiteController {
  constructor(
    private readonly coursePrerequisiteService: CoursePrerequisiteService,
  ) {}

  @Get(':courseId')
  public async getCoursePrerequisites(@Param('courseId') courseId: string) {
    return this.coursePrerequisiteService.getPrerequisites(courseId);
  }

  @Get()
  public async getAllCoursePrerequisites() {
    return this.coursePrerequisiteService.getAllCoursePrerequisites();
  }
}
