import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { IdDto } from '../common/exceptions/dtos/id.dto';
import { CoursePrerequisiteService } from './course-prerequisite.service';

@ApiTags('Course prerequisites')
@Controller('course-prerequisites')
export class CoursePrerequisiteController {
  constructor(
    private readonly coursePrerequisiteService: CoursePrerequisiteService,
  ) {}

  @Get(':courseId')
  public async getCoursePrerequisites(@Param('courseId') { id }: IdDto) {
    return this.coursePrerequisiteService.getPrerequisites({ courseId: id });
  }

  @Get()
  public async getAllCoursePrerequisites() {
    return this.coursePrerequisiteService.getAllCoursePrerequisites();
  }
}
