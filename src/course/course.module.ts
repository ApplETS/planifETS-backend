import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CourseController } from './course.controller';
import { CourseRepository } from './course.repository';
import { CourseService } from './course.service';
import { TokenStatsController } from './token-stats.controller';
import { TokenStatsService } from './token-stats.service';

@Module({
  imports: [PrismaModule],
  controllers: [TokenStatsController, CourseController],
  providers: [CourseService, CourseRepository, TokenStatsService],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}
