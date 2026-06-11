import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { PrismaService } from './prisma/prisma.service';

type DependencyStatus = 'ok' | 'down' | 'unconfigured';

type DependencyHealth = {
  status: DependencyStatus;
  url?: string;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
};

type DiagnosticHealthResponse = {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    frontend: DependencyHealth;
    postgres: DependencyHealth;
    qdrant: DependencyHealth;
  };
};

type ReadinessHealthResponse = {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    postgres: DependencyHealth;
    qdrant: DependencyHealth;
  };
};

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Hello World',
  })
  public getHello(): string {
    return 'Hello World!';
  }

  @Get('health')
  @ApiTags('Health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns a diagnostic view of the application and its dependencies',
  })
  public async healthCheck(): Promise<DiagnosticHealthResponse> {
    const [postgres, frontend, qdrant] = await Promise.all([
      this.checkPostgresHealth(),
      this.checkHttpHealth(process.env.FRONTEND_URL, '/'),
      this.checkHttpHealth(process.env.QDRANT_URL, '/healthz'),
    ]);

    const criticalStatuses = [postgres, qdrant].filter((service) => service.status !== 'unconfigured');
    const hasCriticalFailure = criticalStatuses.some((service) => service.status !== 'ok');
    const hasNonCriticalFailure = frontend.status === 'down';
    const healthStatus = hasCriticalFailure ? 'error' : hasNonCriticalFailure ? 'degraded' : 'ok';

    return {
      status: healthStatus,
      timestamp: new Date().toISOString(),
      services: {
        frontend,
        postgres,
        qdrant,
      },
    };
  }

  @Get('health/live')
  @ApiOperation({
    summary: 'Liveness probe endpoint',
    description: 'Indicates that the process is running and able to serve requests',
  })
  public getLiveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/ready')
  @ApiOperation({
    summary: 'Readiness probe endpoint',
    description: 'Checks whether the backend can reach its required dependencies',
  })
  public async readinessCheck(@Res({ passthrough: true }) response: Response): Promise<ReadinessHealthResponse> {
    const [postgres, qdrant] = await Promise.all([
      this.checkPostgresHealth(),
      this.checkHttpHealth(process.env.QDRANT_URL, '/healthz'),
    ]);

    const isReady = postgres.status !== 'down' && qdrant.status !== 'down';

    response.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: isReady ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        postgres,
        qdrant,
      },
    };
  }

  @Get('/health/monitoring')
  @ApiTags('Health')
  @ApiOperation({
    summary: 'Health check endpoint for monitoring testing',
    description: 'Throws an error to test monitoring integration',
  })
  public getError() {
    throw new Error("Monitoring test error from /health/monitoring endpoint");
  }

  private async checkPostgresHealth(): Promise<DependencyHealth> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error: this.toErrorMessage(error),
      };
    }
  }

  private async checkHttpHealth(baseUrl: string | undefined, path: string): Promise<DependencyHealth> {
    if (!baseUrl) {
      return {
        status: 'unconfigured',
      };
    }

    const startedAt = Date.now();

    try {
      const targetUrl = new URL(path, baseUrl);
      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      const isHealthy = response.status >= 200 && response.status < 400;

      return {
        status: isHealthy ? 'ok' : 'down',
        url: targetUrl.toString(),
        statusCode: response.status,
        latencyMs: Date.now() - startedAt,
        error: isHealthy ? undefined : `Unexpected status code ${response.status}`,
      };
    } catch (error) {
      return {
        status: 'down',
        url: baseUrl,
        latencyMs: Date.now() - startedAt,
        error: this.toErrorMessage(error),
      };
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown health check error';
  }
}
