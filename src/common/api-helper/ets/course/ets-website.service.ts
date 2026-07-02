import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { ETS_USER_AGENT, getEtsWebsitePageUrl } from '@/common/utils/url/url-constants';

import { fetchCourseDescription } from './course-description-fetcher';

@Injectable()
export class EtsWebsiteService {
  private readonly logger = new Logger(EtsWebsiteService.name);

  constructor(private readonly httpService: HttpService) {}

  public async fetchCourseDescriptionFromEtsWebsite(
    courseCode: string,
  ): Promise<string> {
    return fetchCourseDescription(this.httpService, this.logger, courseCode, {
      source: 'ETS website',
      url: getEtsWebsitePageUrl(courseCode),
      requestHeaders: { 'User-Agent': ETS_USER_AGENT },
      descriptionSelectors: [
        '#page-content .c-fold__text.o-text',
        '.c-fold__text.o-text',
      ],
    });
  }
}
