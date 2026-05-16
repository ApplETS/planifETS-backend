import { LogLevel } from '@nestjs/common';

import { SentryLogger } from '@/common/logger/sentry.logger';
import { MonitoringService } from '@/monitoring/monitoring.service';

function resolveLogLevels(): LogLevel[] {
  return process.env.LOG_LEVELS
    ? (process.env.LOG_LEVELS.split(',') as LogLevel[])
    : ['error', 'warn', 'log'];
}

export function createAppLoggerFactory(monitoring?: MonitoringService, context?: string): SentryLogger {
  const logger = new SentryLogger(context ?? 'Application', {}, monitoring);
  logger.setLogLevels(resolveLogLevels());
  return logger;
}
