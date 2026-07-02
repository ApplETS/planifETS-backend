import { Logger } from '@nestjs/common';

import { isAxiosError } from './errorUtil';

const RATE_LIMIT_HEADERS = [
  'retry-after',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
];

export function logHttpFetchFailure(
  logger: Logger,
  source: string,
  courseCode: string,
  error: unknown,
): void {
  if (!isAxiosError(error)) {
    logger.warn(
      `HTTP request failed for course ${courseCode} on ${source}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  const rateLimitHeaders = Object.fromEntries(
    RATE_LIMIT_HEADERS.map((header) => [header, error.response?.headers?.[header]])
      .filter(([, value]) => value !== undefined),
  );

  logger.warn(
    `HTTP request failed for course ${courseCode} on ${source}: status=${error.response?.status ?? 'none'} code=${error.code ?? 'none'} message=${error.message} rateLimitHeaders=${JSON.stringify(rateLimitHeaders)}`,
  );
}
