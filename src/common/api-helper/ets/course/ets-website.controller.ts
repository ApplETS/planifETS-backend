import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { EtsPlanETSService } from './ets-planets.service';
import { EtsWebsiteService } from './ets-website.service';

@ApiTags('ÉTS website')
@Controller('ets')
export class EtsWebsiteController {
  constructor(
    private readonly etsWebsiteService: EtsWebsiteService,
    private readonly etsPlanETSService: EtsPlanETSService,
  ) {}

  @Get('website/course/:code/description')
  public fetchCourseDescriptionFromEtsWebsite(
    @Param('code') code: string,
  ): Promise<string> {
    return this.etsWebsiteService.fetchCourseDescriptionFromEtsWebsite(code);
  }

  @Get('planets/course/:code/description')
  public fetchCourseDescriptionFromPlanETS(
    @Param('code') code: string,
  ): Promise<string> {
    return this.etsPlanETSService.fetchCourseDescriptionFromPlanETS(code);
  }
}
