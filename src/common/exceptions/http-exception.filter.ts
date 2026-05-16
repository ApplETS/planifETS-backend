import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { MonitoringService } from '@/monitoring/monitoring.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly monitoring: MonitoringService) {}

  public catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    try {
      this.monitoring.captureException(exception, {
        tags: {
          'exception.filter': 'HttpExceptionFilter',
          'http.status_code': String(status),
        },
        extras: {
          path: request.url,
          method: request.method,
          ...(request.body && { body: request.body }),
        },
      });
    } catch (err) {
      console.error('Monitoring capture failed for HttpException:', err);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || 'Internal Server Error',
    });
  }
}
