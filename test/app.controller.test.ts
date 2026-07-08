import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

import { AppController } from '../src/app.controller';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController', () => {
  let controller: AppController;

  const prisma = {
    $queryRaw: jest.fn()
  };

  const originalEnv = {
    FRONTEND_URL: process.env.FRONTEND_URL,
    QDRANT_URL: process.env.QDRANT_URL
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    global.fetch = jest.fn().mockResolvedValue({
      status: 200
    }) as jest.Mock;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: prisma }]
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  afterEach(() => {
    if (originalEnv.FRONTEND_URL === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalEnv.FRONTEND_URL;
    }

    if (originalEnv.QDRANT_URL === undefined) {
      delete process.env.QDRANT_URL;
    } else {
      process.env.QDRANT_URL = originalEnv.QDRANT_URL;
    }
  });

  it('should return hello world', () => {
    expect(controller.getHello()).toBe('Hello World!');
  });

  it('should return liveness status', () => {
    const result = controller.getLiveness();

    expect(result).toEqual({
      status: 'ok',
      timestamp: expect.any(String)
    });
  });

  it('should throw the monitoring test error', () => {
    expect(() => controller.getError()).toThrow(
      'Monitoring test error from /health/monitoring endpoint'
    );
  });

  describe('healthCheck', () => {
    it('should return ok when postgres, frontend, and qdrant are healthy', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200
      });

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          frontend: {
            status: 'ok',
            url: 'https://frontend.example.com/',
            statusCode: 200,
            latencyMs: expect.any(Number),
            error: undefined
          },
          postgres: {
            status: 'ok',
            latencyMs: expect.any(Number)
          },
          qdrant: {
            status: 'ok',
            url: 'https://qdrant.example.com/healthz',
            statusCode: 200,
            latencyMs: expect.any(Number),
            error: undefined
          }
        }
      });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return degraded when only the frontend is down', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 500
        })
        .mockResolvedValueOnce({
          status: 200
        });

      const result = await controller.healthCheck();

      expect(result.status).toBe('degraded');
      expect(result.services.frontend).toMatchObject({
        status: 'down',
        url: 'https://frontend.example.com/',
        statusCode: 500,
        error: 'Unexpected status code 500'
      });
      expect(result.services.qdrant.status).toBe('ok');
      expect(result.services.postgres.status).toBe('ok');
    });

    it('should return error when qdrant is down', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 200
        })
        .mockResolvedValueOnce({
          status: 503
        });

      const result = await controller.healthCheck();

      expect(result.status).toBe('error');
      expect(result.services.qdrant).toMatchObject({
        status: 'down',
        url: 'https://qdrant.example.com/healthz',
        statusCode: 503,
        error: 'Unexpected status code 503'
      });
    });

    it('should return error when postgres is down with an Error', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));

      const result = await controller.healthCheck();

      expect(result.status).toBe('error');
      expect(result.services.postgres).toEqual({
        status: 'down',
        latencyMs: expect.any(Number),
        error: 'database unavailable'
      });
    });

    it('should return Unknown health check error when postgres throws a non-Error value', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      prisma.$queryRaw.mockRejectedValue('database failed');

      const result = await controller.healthCheck();

      expect(result.status).toBe('error');
      expect(result.services.postgres).toEqual({
        status: 'down',
        latencyMs: expect.any(Number),
        error: 'Unknown health check error'
      });
    });

    it('should return ok when frontend and qdrant are unconfigured and postgres is healthy', async () => {
      delete process.env.FRONTEND_URL;
      delete process.env.QDRANT_URL;

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          frontend: {
            status: 'unconfigured'
          },
          postgres: {
            status: 'ok',
            latencyMs: expect.any(Number)
          },
          qdrant: {
            status: 'unconfigured'
          }
        }
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return down when an HTTP health check throws an Error', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('frontend timeout'))
        .mockResolvedValueOnce({
          status: 200
        });

      const result = await controller.healthCheck();

      expect(result.status).toBe('degraded');
      expect(result.services.frontend).toEqual({
        status: 'down',
        url: 'https://frontend.example.com',
        latencyMs: expect.any(Number),
        error: 'frontend timeout'
      });
    });

    it('should return Unknown health check error when an HTTP health check throws a non-Error value', async () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce('frontend failed')
        .mockResolvedValueOnce({
          status: 200
        });

      const result = await controller.healthCheck();

      expect(result.status).toBe('degraded');
      expect(result.services.frontend).toEqual({
        status: 'down',
        url: 'https://frontend.example.com',
        latencyMs: expect.any(Number),
        error: 'Unknown health check error'
      });
    });
  });

  describe('readinessCheck', () => {
    function createResponseMock(): Response {
      return {
        status: jest.fn().mockReturnThis()
      } as unknown as Response;
    }

    it('should return ok and HTTP 200 when postgres and qdrant are healthy', async () => {
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      const response = createResponseMock();

      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200
      });

      const result = await controller.readinessCheck(response);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          postgres: {
            status: 'ok',
            latencyMs: expect.any(Number)
          },
          qdrant: {
            status: 'ok',
            url: 'https://qdrant.example.com/healthz',
            statusCode: 200,
            latencyMs: expect.any(Number),
            error: undefined
          }
        }
      });
    });

    it('should return ok and HTTP 200 when qdrant is unconfigured', async () => {
      delete process.env.QDRANT_URL;

      const response = createResponseMock();

      const result = await controller.readinessCheck(response);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          postgres: {
            status: 'ok',
            latencyMs: expect.any(Number)
          },
          qdrant: {
            status: 'unconfigured'
          }
        }
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return error and HTTP 503 when qdrant is down', async () => {
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      const response = createResponseMock();

      (global.fetch as jest.Mock).mockResolvedValue({
        status: 500
      });

      const result = await controller.readinessCheck(response);

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE
      );
      expect(result.status).toBe('error');
      expect(result.services.qdrant).toMatchObject({
        status: 'down',
        url: 'https://qdrant.example.com/healthz',
        statusCode: 500,
        error: 'Unexpected status code 500'
      });
    });

    it('should return error and HTTP 503 when postgres is down', async () => {
      process.env.QDRANT_URL = 'https://qdrant.example.com';

      const response = createResponseMock();

      prisma.$queryRaw.mockRejectedValue(new Error('postgres down'));

      const result = await controller.readinessCheck(response);

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE
      );
      expect(result.status).toBe('error');
      expect(result.services.postgres).toEqual({
        status: 'down',
        latencyMs: expect.any(Number),
        error: 'postgres down'
      });
    });
  });
});
