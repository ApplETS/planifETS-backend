import { Module } from '@nestjs/common';
import { EtsCourseService } from 'src/common/api-helper/ets/course/ets-course.service';
import { EtsDepartementService } from 'src/common/api-helper/ets/departement/ets-departement.service';

@Module({
  providers: [EtsCourseService, EtsDepartementService],
  exports: [EtsCourseService, EtsDepartementService],
})
export class EtsModule {}
