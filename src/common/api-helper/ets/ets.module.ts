import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EtsCourseController } from './course/ets-course.controller';
import { EtsCourseService } from './course/ets-course.service';
import { EtsProgramController } from './program/ets-program.controller';
import { EtsProgramService } from './program/ets-program.service';

@Module({
  imports: [HttpModule],
  controllers: [EtsCourseController, EtsProgramController],
  providers: [EtsCourseService, EtsProgramService],
  exports: [EtsCourseService, EtsProgramService],
})
export class EtsModule {}
