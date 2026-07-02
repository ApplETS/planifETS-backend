import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { getPlanETSCourseUrl } from '@/common/utils/url/url-constants';

import { fetchCourseDescription } from './course-description-fetcher';

const DESCRIPTION_SELECTOR =
  '#ctl00_ContentPlaceHolderMainPublicPlanCours_lblDescriptifCours';

@Injectable()
export class EtsPlanETSService {
  private readonly logger = new Logger(EtsPlanETSService.name);

  constructor(private readonly httpService: HttpService) {}

  public async fetchCourseDescriptionFromPlanETS(
    courseCode: string,
  ): Promise<string> {
    return fetchCourseDescription(this.httpService, this.logger, courseCode, {
      source: 'PlanETS',
      url: getPlanETSCourseUrl(courseCode),
      descriptionSelectors: [DESCRIPTION_SELECTOR],
    });
  }
}
