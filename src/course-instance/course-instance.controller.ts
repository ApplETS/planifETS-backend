import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CourseInstanceService } from './course-instance.service';

@Controller('course-instance')
export class CourseInstanceController {
  constructor(private readonly courseInstanceService: CourseInstanceService) {}

  @Get(':id')
  public getCourseInstance(@Param('id') id: string) {
    return this.courseInstanceService.courseInstance({ id });
  }

  @Get()
  public getAllCourseInstances() {
    return this.courseInstanceService.courseInstances();
  }
}
