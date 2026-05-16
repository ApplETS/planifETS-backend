import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';

import { MonitoringContext, MonitoringLogLevel, MonitoringService } from './monitoring.service';

@Injectable()
export class SentryMonitoringService extends MonitoringService {
  public captureException(exception: unknown, context?: MonitoringContext): void {
    Sentry.withScope((scope) => {
      Object.entries(context?.tags ?? {}).forEach(([k, v]) => scope.setTag(k, v));
      Object.entries(context?.extras ?? {}).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(exception);
    });
  }

  public captureLog(level: MonitoringLogLevel, message: string, attributes?: Record<string, unknown>): void {
    const sentryLevel = level === 'log' ? 'info' : level;
    Sentry.logger[sentryLevel](message, attributes ?? {});
  }
}
