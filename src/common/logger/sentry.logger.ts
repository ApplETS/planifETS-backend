import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

import { formatMessage } from '../utils/stringUtil';

@Injectable()
export class SentryLogger extends ConsoleLogger {
  public log(message: string | object, context?: string) {
    super.log(message, context);
    Sentry.logger.info(formatMessage(message), {
      context,
      ...this.extractAttributes(message),
    });
  }

  public error(message: string | Error | object, stack?: string, context?: string) {
    super.error(message, stack, context);
    Sentry.logger.error(formatMessage(message instanceof Error ? message.message : message), {
      context,
      stack: stack ?? (message instanceof Error ? message.stack : undefined),
      ...this.extractAttributes(message),
    });
  }

  public warn(message: string | object, context?: string) {
    super.warn(message, context);
    Sentry.logger.warn(formatMessage(message), {
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
