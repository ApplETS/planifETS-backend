import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cheerio, load } from 'cheerio';
import { Element } from 'domhandler';
import { firstValueFrom } from 'rxjs';

import { logHttpFetchFailure } from '@/common/utils/error/logHttpFetchFailure';
import { htmlFragmentToPlainText } from '@/common/utils/html/htmlFragmentToPlainText';
import { getPlanetsCourseUrl } from '@/common/utils/url/url-constants';

const DESCRIPTION_SELECTOR =
  '#ctl00_ContentPlaceHolderMainPublicPlanCours_lblDescriptifCours';

@Injectable()
export class EtsPlanetsService {
  private readonly logger = new Logger(EtsPlanetsService.name);

  constructor(private readonly httpService: HttpService) {}

  public async fetchCourseDescriptionFromPlanets(
    courseCode: string,
  ): Promise<string> {
    let html: string;

    try {
      const response = await firstValueFrom(
        this.httpService.get(getPlanetsCourseUrl(courseCode), {
          responseType: 'text',
          timeout: 10_000,
        }),
      );
      html = String(response.data);
    } catch (error) {
      logHttpFetchFailure(this.logger, 'PlanETS', courseCode, error);
      throw error;
    }

    const descriptionSection = this.extractDescriptionSection(html, courseCode);
    const text = htmlFragmentToPlainText(descriptionSection);

    if (!text) {
      throw new Error('Could not extract course description from PlanETS');
    }

    return text;
  }

  private extractDescriptionSection(
    html: string,
    courseCode: string,
  ): Cheerio<Element> {
    const $ = load(html);
    const descriptionContainer = $(DESCRIPTION_SELECTOR).first();

    if (descriptionContainer.length === 0) {
      this.logger.verbose(
        `No description section found for course ${courseCode} on PlanETS. Page title="${$('title').first().text().trim()}" bodySnippet="${$('body').text().trim().slice(0, 200).replaceAll(/\s+/g, ' ')}"`,
      );
      throw new Error('Could not extract course description from PlanETS');
    }

    descriptionContainer.find('script, style, noscript').remove();

    return descriptionContainer;
  }
}
