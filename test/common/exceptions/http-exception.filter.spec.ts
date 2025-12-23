
jest.mock('@sentry/node');
jest.mock('@sentry/node');
import { ArgumentsHost, HttpException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

import { HttpExceptionFilter } from '../../../src/common/exceptions/http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let sentryCaptureSpy: jest.SpyInstance;
  let sentryWithScopeSpy: jest.SpyInstance;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    sentryCaptureSpy = jest.spyOn(Sentry, 'captureException').mockImplementation(() => 'id');
    const mockScope = { setTag: jest.fn(), setExtra: jest.fn() };
    sentryWithScopeSpy = jest.spyOn(Sentry, 'withScope').mockImplementation((cb) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      if (typeof cb === 'function') (cb as Function)(mockScope);
    });

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
    // Create a mock exception with no message
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

  it('should capture exception with Sentry and send proper response', () => {
    const exception = new HttpException('Test error', 400);
    filter.catch(exception, mockHost);

    expect(sentryWithScopeSpy).toHaveBeenCalled();
    expect(sentryCaptureSpy).toHaveBeenCalledWith(exception);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/test',
        message: 'Test error',
      })
    );
  });

  it('should handle Sentry capture failure gracefully', () => {
    sentryWithScopeSpy.mockImplementationOnce(() => { throw new Error('fail'); });
    const exception = new HttpException('Test error', 500);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    filter.catch(exception, mockHost);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Sentry capture failed for HttpException:',
      expect.any(Error)
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/test',
        message: 'Test error',
      })
    );
  });
});
