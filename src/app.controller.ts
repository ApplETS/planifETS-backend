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

  @Get("/debug-sentry")
  @ApiTags('Health')
  public getError() {
    throw new Error("Sample error!");
  }
}
