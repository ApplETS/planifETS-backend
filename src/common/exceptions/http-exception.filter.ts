import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { PosthogMonitoringService } from '@/monitoring/posthog-monitoring.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly monitoring: PosthogMonitoringService) {}

  public catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

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
        console.error('Monitoring capture failed for HttpException:', err);
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
