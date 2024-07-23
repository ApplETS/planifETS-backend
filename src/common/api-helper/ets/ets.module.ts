import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { EtsCourseService } from './course/ets-course.service';
import { EtsController } from './ets.controller';
import { HeaderInterceptor } from './header.interceptor';
import { EtsProgramService } from './program/ets-program.service';

@Module({
  imports: [HttpModule],
  controllers: [EtsController],
  providers: [
    EtsCourseService,
    EtsProgramService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HeaderInterceptor,
    },
  ],
  exports: [EtsCourseService, EtsProgramService],
})
export class EtsModule {}
