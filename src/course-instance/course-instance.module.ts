import { Module } from '@nestjs/common';

import { CourseInstanceController } from './course-instance.controller';
import { CourseInstanceService } from './course-instance.service';

@Module({
  controllers: [CourseInstanceController],
  providers: [CourseInstanceService],
})
export class CourseInstanceModule {}
