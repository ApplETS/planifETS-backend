import { LogLevel } from '@nestjs/common';

import { SentryLogger } from '@/common/logger/sentry.logger';

function resolveLogLevels(): LogLevel[] {
  return process.env.LOG_LEVELS
    ? (process.env.LOG_LEVELS.split(',') as LogLevel[])
    : ['error', 'warn', 'log'];
}

export function createAppLoggerFactory(context?: string): SentryLogger {
  const logger = new SentryLogger(context ?? 'Application');
  logger.setLogLevels(resolveLogLevels());
  return logger;
}
