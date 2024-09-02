import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ProgramCourseController } from './program-course.controller';
import { ProgramCourseService } from './program-course.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProgramCourseController],
  providers: [ProgramCourseService],
  exports: [ProgramCourseService],
})
export class ProgramCourseModule {}
