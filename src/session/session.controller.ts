import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
}
