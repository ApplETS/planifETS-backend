import { Controller, Get, Param } from '@nestjs/common';
import { CourseInstance } from '@prisma/client';

import { CourseInstanceService } from './course-instance.service';

@Controller('course-instances')
export class CourseInstanceController {
  constructor(private readonly courseInstanceService: CourseInstanceService) {}

  @Get(':id')
  public getCourseInstance(
    @Param('id') id: string,
  ): Promise<CourseInstance | null> {
    return this.courseInstanceService.getCourseInstance({ id });
  }

  @Get()
  public getAllCourseInstances(): Promise<CourseInstance[] | null> {
    return this.courseInstanceService.getAllCourseInstances();
  }
}
