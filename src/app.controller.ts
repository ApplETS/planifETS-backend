import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';


@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Hello World',
  })
  public getHello(): string {
    return 'Hello World!';
  }
}
