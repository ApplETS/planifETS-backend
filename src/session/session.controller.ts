import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session } from '@prisma/client';

import { SessionDto } from './dtos/session.dto';
import { SessionService } from './session.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) { }

  @Get()
  @ApiOkResponse({ type: [SessionDto] })
  public async getAllSessions(): Promise<Session[] | null> {
    return this.sessionService.getAllSessions();
  }

  @Get('latest-available')
  @ApiOperation({ summary: '🟢 Get the latest available session' })
  @ApiOkResponse({ type: SessionDto })
  public async getLatestAvailableSession(): Promise<Session | null> {
    return this.sessionService.getLatestAvailableSession();
  }
}
