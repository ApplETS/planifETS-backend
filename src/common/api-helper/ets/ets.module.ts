import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EtsApiController } from './course/ets-api.controller';
import { EtsApiService } from './course/ets-api.service';
import { EtsPlanETSService } from './course/ets-planets.service';
import { EtsWebsiteController } from './course/ets-website.controller';
import { EtsWebsiteService } from './course/ets-website.service';
import { EtsProgramController } from './program/ets-program.controller';
import { EtsProgramService } from './program/ets-program.service';

@Module({
  imports: [HttpModule],
  controllers: [EtsApiController, EtsWebsiteController, EtsProgramController],
  providers: [EtsApiService, EtsWebsiteService, EtsPlanETSService, EtsProgramService],
  exports: [EtsApiService, EtsWebsiteService, EtsPlanETSService, EtsProgramService],
})
export class EtsModule {}
