import { Module } from '@nestjs/common';

import { CourseModule } from '../course/course.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramCourseService } from '../program-course/program-course.service';
import { PrerequisiteController } from './prerequisite.controller';
import { PrerequisiteService } from './prerequisite.service';

@Module({
  imports: [PrismaModule, CourseModule],
  controllers: [PrerequisiteController],
  providers: [PrerequisiteService, ProgramCourseService],
  exports: [PrerequisiteService],
})
export class PrerequisiteModule {}
