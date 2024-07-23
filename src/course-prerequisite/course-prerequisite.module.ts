import { Module } from '@nestjs/common';

import { CoursePrerequisiteController } from './course-prerequisite.controller';
import { CoursePrerequisiteService } from './course-prerequisite.service';

@Module({
  controllers: [CoursePrerequisiteController],
  providers: [CoursePrerequisiteService],
})
export class CoursePrerequisiteModule {}
