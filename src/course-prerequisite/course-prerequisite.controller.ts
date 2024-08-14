import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CoursePrerequisiteService } from './course-prerequisite.service';

@ApiTags('Course prerequisites')
@Controller('course-prerequisites')
export class CoursePrerequisiteController {
  constructor(
    private readonly coursePrerequisiteService: CoursePrerequisiteService,
  ) {}

  @Get(':courseId')
  public async getCoursePrerequisites(@Param('courseId') courseId: string) {
    //TODO: Change to int IdDto? (Prisma update uuid to int)
    return this.coursePrerequisiteService.getPrerequisites(courseId);
  }

  @Get()
  public async getAllCoursePrerequisites() {
    return this.coursePrerequisiteService.getAllCoursePrerequisites();
  }
}
