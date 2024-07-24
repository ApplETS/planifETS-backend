import { Controller, Get, Param } from '@nestjs/common';
import { CourseInstance } from '@prisma/client';

import { CourseInstanceService } from './course-instance.service';

@Controller('course-instance')
export class CourseInstanceController {
  constructor(private readonly courseInstanceService: CourseInstanceService) {}

  @Get(':id')
  public getCourseInstance(
    @Param('id') id: string,
  ): Promise<CourseInstance | null> {
    return this.courseInstanceService.courseInstance({ id });
  }

  @Get()
  public getAllCourseInstances(): Promise<CourseInstance[] | null> {
    return this.courseInstanceService.getAllCourseInstances();
  }
}
