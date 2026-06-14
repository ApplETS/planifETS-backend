import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { PosthogMonitoringService } from '@/monitoring/posthog-monitoring.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly monitoring: PosthogMonitoringService) {}

  public catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const cause = (exception as { cause?: Error }).cause;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${exception.message}`,
        cause?.stack ?? exception.stack,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status} ${exception.message}`);
    }

    // PostHogInterceptor captures status >= 500; only capture 4xx here to avoid duplication
    if (status < 500) {
      try {
        this.monitoring.captureException(exception, {
          'exception.filter': 'HttpExceptionFilter',
          'http.status_code': String(status),
          path: request.url,
          method: request.method,
          ...(request.body && { body: request.body }),
        });
      } catch (err) {
        this.logger.error('Monitoring capture failed for HttpException:', err);
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || 'Internal Server Error',
    });
  }
}
