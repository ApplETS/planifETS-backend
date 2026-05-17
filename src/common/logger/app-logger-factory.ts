import { LogLevel } from '@nestjs/common';

import { AppLogger } from '@/common/logger/app.logger';
import { PosthogMonitoringService } from '@/monitoring/posthog-monitoring.service';

function resolveLogLevels(): LogLevel[] {
  return process.env.LOG_LEVELS
    ? (process.env.LOG_LEVELS.split(',') as LogLevel[])
    : ['error', 'warn', 'log'];
}

export function createAppLoggerFactory(monitoring?: PosthogMonitoringService, context?: string): AppLogger {
  const logger = new AppLogger(context ?? 'Application', {}, monitoring);
  logger.setLogLevels(resolveLogLevels());
  return logger;
}
