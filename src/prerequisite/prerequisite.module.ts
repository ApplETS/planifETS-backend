import { Module } from '@nestjs/common';

import { CourseService } from '../course/course.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramCourseService } from '../program-course/program-course.service';
import { PrerequisiteController } from './prerequisite.controller';
import { PrerequisiteService } from './prerequisite.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrerequisiteController],
  providers: [PrerequisiteService, ProgramCourseService, CourseService],
  exports: [PrerequisiteService],
})
export class PrerequisiteModule {}
