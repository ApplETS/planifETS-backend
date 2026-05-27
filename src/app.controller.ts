import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller()
export class AppController {
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
    description: 'Returns the health status of the application',
  })
  public healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
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

  @Get('info')
  @ApiTags('Info')
  @ApiOperation({
    summary: 'Application info',
    description: 'Returns the git commit SHA and environment of the running instance',
  })
  public getInfo(): { gitSha: string | null; environment: string } {
    return {
      gitSha: process.env.APP_GIT_SHORT_SHA ?? null,
      environment: process.env.APP_ENV ?? 'development',
    };
  }
}
