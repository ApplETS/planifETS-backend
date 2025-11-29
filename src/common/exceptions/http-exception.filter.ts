import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  public catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    try {
      Sentry.withScope((scope) => {
        scope.setTag('exception.filter', 'HttpExceptionFilter');
        scope.setTag('http.status_code', String(status));
        scope.setExtra('path', request.url);
        scope.setExtra('method', request.method);
        if (request.body) {
          scope.setExtra('body', request.body);
        }

        Sentry.captureException(exception);
      });
    } catch (err) {
      console.error('Sentry capture failed for HttpException:', err);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || 'Internal Server Error',
    });
  }
}
