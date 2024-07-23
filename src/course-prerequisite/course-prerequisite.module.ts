import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';

import { CoursePrerequisiteController } from './course-prerequisite.controller';
import { CoursePrerequisiteService } from './course-prerequisite.service';

@Module({
  imports: [PrismaModule],
  controllers: [CoursePrerequisiteController],
  providers: [CoursePrerequisiteService],
})
export class CoursePrerequisiteModule {}
