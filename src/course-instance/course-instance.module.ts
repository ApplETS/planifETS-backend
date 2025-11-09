import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CourseInstanceController } from './course-instance.controller';
import { CourseInstanceService } from './course-instance.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourseInstanceController],
  providers: [CourseInstanceService],
  exports: [CourseInstanceService],
})
export class CourseInstanceModule {}
