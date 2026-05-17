import { ConsoleLogger, ConsoleLoggerOptions, Injectable, Optional } from '@nestjs/common';

import { formatMessage } from '@/common/utils/stringUtil';
import { PosthogMonitoringService } from '@/monitoring/posthog-monitoring.service';

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor(
    context?: string,
    options?: ConsoleLoggerOptions,
    @Optional() private readonly monitoring?: PosthogMonitoringService,
  ) {
    super(context ?? '', options ?? {});
  }

  public log(message: string | object, context?: string) {
    super.log(message, context);
    this.monitoring?.captureLog('log', formatMessage(message), {
      context,
      ...this.extractAttributes(message),
    });
  }

  public error(message: string | Error | object, stack?: string, context?: string) {
    super.error(message, stack, context);
    this.monitoring?.captureLog('error', formatMessage(message instanceof Error ? message.message : message), {
      context,
      stack: stack ?? (message instanceof Error ? message.stack : undefined),
      ...this.extractAttributes(message),
    });
  }

  public warn(message: string | object, context?: string) {
    super.warn(message, context);
    this.monitoring?.captureLog('warn', formatMessage(message), {
      context,
      ...this.extractAttributes(message),
    });
  }

  private extractAttributes(message: string | Error | object): Record<string, unknown> {
    if (typeof message === 'object' && !(message instanceof Error)) {
      return message as Record<string, unknown>;
    }
    return {};
  }
}
