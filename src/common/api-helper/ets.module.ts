import { Module } from '@nestjs/common';
import { EtsCourseService } from 'src/common/api-helper/ets/course/ets-course.service';

import { EtsProgramService } from './ets/program/ets-program.service';

@Module({
  providers: [EtsCourseService, EtsProgramService],
  exports: [EtsCourseService, EtsProgramService],
})
export class EtsModule {}
