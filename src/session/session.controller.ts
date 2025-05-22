import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session } from '@prisma/client';

import { SessionService } from './session.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  public async getAllSessions(): Promise<Session[] | null> {
    return this.sessionService.getAllSessions();
  }

  @Get('latest-available')
  @ApiOperation({ summary: '🟢 Get the latest available session' })
  public async getLatestAvailableSession(): Promise<Session | null> {
    return this.sessionService.getLatestAvailableSession();
  }
}
