import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CourseInstance } from '@prisma/client';

import { UuidDto } from '../common/exceptions/dtos/uuid.dto';
import { CourseInstanceService } from './course-instance.service';

@ApiTags('Course instances')
@Controller('course-instances')
export class CourseInstanceController {
  constructor(private readonly courseInstanceService: CourseInstanceService) {}

  @Get(':id')
  public getCourseInstance(
    @Param('') { id }: UuidDto,
  ): Promise<CourseInstance | null> {
    return this.courseInstanceService.getCourseInstance({ id });
  }

  @Get()
  public getAllCourseInstances(): Promise<CourseInstance[] | null> {
    return this.courseInstanceService.getAllCourseInstances();
  }
}
