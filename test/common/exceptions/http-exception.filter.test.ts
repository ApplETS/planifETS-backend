import { ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

import { HttpExceptionFilter } from '@/common/exceptions/http-exception.filter';
import { PosthogMonitoringService } from '@/monitoring/posthog-monitoring.service';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockMonitoring: jest.Mocked<Pick<PosthogMonitoringService, 'captureException'>>;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockMonitoring = { captureException: jest.fn() };
    filter = new HttpExceptionFilter(mockMonitoring as unknown as PosthogMonitoringService);

    mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockRequest = { url: '/test', method: 'GET', body: { foo: 'bar' } };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use default message if exception message is missing', () => {
    const exception = new HttpException(undefined as unknown as string, 404);
    Object.defineProperty(exception, 'message', { value: undefined });
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/test',
        message: 'Internal Server Error',
      })
    );
  });

  it('should handle missing request body gracefully', () => {
    mockRequest.body = undefined;
    const exception = new HttpException('No body', 403);
    filter.catch(exception, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        path: '/test',
        message: 'No body',
      })
    );
  });

  it('should not throw if a non-HttpException is passed', () => {
    type TeapotException = { getStatus: () => number; message: string };
    const badException: TeapotException = {
      getStatus: () => 418,
      message: 'I am a teapot'
    };

    expect(() => filter.catch(badException as unknown as HttpException, mockHost)).not.toThrow();
    expect(mockResponse.status).toHaveBeenCalledWith(418);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 418,
        path: '/test',
        message: 'I am a teapot',
      })
    );
  });

  it('should capture 4xx exceptions via monitoring and send proper response', () => {
    const exception = new HttpException('Test error', 400);
    filter.catch(exception, mockHost);

    expect(mockMonitoring.captureException).toHaveBeenCalledWith(
      exception,
      expect.objectContaining({
        'http.status_code': '400',
        path: '/test',
        method: 'GET',
      })
    );
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/test',
        message: 'Test error',
      })
    );
  });

  it('should not capture 5xx exceptions (PostHogInterceptor handles those)', () => {
    const exception = new HttpException('Server error', 500);
    filter.catch(exception, mockHost);

    expect(mockMonitoring.captureException).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should handle monitoring capture failure gracefully', () => {
    mockMonitoring.captureException.mockImplementationOnce(() => { throw new Error('fail'); });
    const exception = new HttpException('Test error', 400);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    filter.catch(exception, mockHost);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Monitoring capture failed for HttpException:',
      expect.any(Error)
    );
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });
});
