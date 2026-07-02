import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { getPlanetsCourseUrl } from '@/common/utils/url/url-constants';

import { fetchCourseDescription } from './course-description-fetcher';

const DESCRIPTION_SELECTOR =
  '#ctl00_ContentPlaceHolderMainPublicPlanCours_lblDescriptifCours';

@Injectable()
export class EtsPlanetsService {
  private readonly logger = new Logger(EtsPlanetsService.name);

  constructor(private readonly httpService: HttpService) {}

  public async fetchCourseDescriptionFromPlanets(
    courseCode: string,
  ): Promise<string> {
    return fetchCourseDescription(this.httpService, this.logger, courseCode, {
      source: 'PlanETS',
      url: getPlanetsCourseUrl(courseCode),
      descriptionSelectors: [DESCRIPTION_SELECTOR],
    });
  }
}
