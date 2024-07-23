import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EtsCourseService } from './course/ets-course.service';
import { EtsController } from './ets.controller';
import { EtsProgramService } from './program/ets-program.service';

@Module({
  imports: [HttpModule],
  controllers: [EtsController],
  providers: [EtsCourseService, EtsProgramService],
  exports: [EtsCourseService, EtsProgramService],
})
export class EtsModule {}
