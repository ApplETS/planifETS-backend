import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Cheerio, load } from 'cheerio';
import { Element } from 'domhandler';
import { firstValueFrom } from 'rxjs';

import { logHttpFetchFailure } from '@/common/utils/error/logHttpFetchFailure';
import { htmlFragmentToPlainText } from '@/common/utils/html/htmlFragmentToPlainText';

interface CourseDescriptionSource {
  source: string;
  url: string;
  requestHeaders?: Record<string, string>;
  descriptionSelectors: string[];
}

export async function fetchCourseDescription(
  httpService: HttpService,
  logger: Logger,
  courseCode: string,
  config: CourseDescriptionSource,
): Promise<string> {
  let html: string;

  try {
    const response = await firstValueFrom(
      httpService.get(config.url, {
        responseType: 'text',
        headers: config.requestHeaders,
        timeout: 10_000,
      }),
    );
    html = String(response.data);
  } catch (error) {
    logHttpFetchFailure(logger, config.source, courseCode, error);
    throw error;
  }

  const descriptionSection = extractDescriptionSection(
    html,
    courseCode,
    logger,
    config,
  );
  const text = htmlFragmentToPlainText(descriptionSection);

  if (!text) {
    throw new Error(`Could not extract course description from ${config.source}`);
  }

  return text;
}

function extractDescriptionSection(
  html: string,
  courseCode: string,
  logger: Logger,
  config: CourseDescriptionSource,
): Cheerio<Element> {
  const $ = load(html);
  let descriptionContainer: Cheerio<Element> | undefined;

  for (const selector of config.descriptionSelectors) {
    const match = $(selector).first() as Cheerio<Element>;
    if (match.length > 0) {
      descriptionContainer = match;
      break;
    }
  }

  if (!descriptionContainer) {
    logger.verbose(
      `No description section found for course ${courseCode} on ${config.source}.`,
    );
    throw new Error(`Could not extract course description from ${config.source}`);
  }

  descriptionContainer.find('script, style, noscript').remove();

  return descriptionContainer;
}
