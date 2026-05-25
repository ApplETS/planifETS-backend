import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
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
  @ApiOperation({
    summary: 'Health check endpoint for monitoring testing',
    description: 'Throws an error to test monitoring integration',
  })
  public getError() {
    throw new Error("Monitoring test error from /health/monitoring endpoint");
  }
}
