import { Logger } from '@nestjs/common';

import { isAxiosError } from './errorUtil';

export function logHttpFetchFailure(
  logger: Logger,
  source: string,
  courseCode: string,
  error: unknown,
): void {
  if (!isAxiosError(error)) {
    logger.verbose(
      `HTTP request failed for course ${courseCode} on ${source}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  logger.verbose(
    `HTTP request failed for course ${courseCode} on ${source}: status=${error.response?.status ?? 'none'} code=${error.code ?? 'none'} message=${error.message}`,
  );
}
