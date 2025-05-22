import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CourseInstance } from '@prisma/client';

import { CourseInstanceService } from './course-instance.service';

@ApiTags('Course instances')
@Controller('course-instances')
export class CourseInstanceController {
  constructor(private readonly courseInstanceService: CourseInstanceService) {}

  @Get()
  public getAllCourseInstances(): Promise<CourseInstance[] | null> {
    return this.courseInstanceService.getAllCourseInstances();
  }
}
