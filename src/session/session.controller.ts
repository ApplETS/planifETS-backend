import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  //TODO: Fix the routes
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  public sessions() {
    return this.sessionService.sessions();
  }

  @Get(':id')
  public session(@Param('id') id: string) {
    return this.sessionService.session(+id);
  }

  @Post()
  public create(@Body() createSessionDto: Prisma.SessionCreateInput) {
    return this.sessionService.createSession(createSessionDto);
  }

  @Patch(':id')
  public upsertSession(
    @Param('id') id: string,
    @Body() updateSessionDto: Prisma.SessionUpdateInput,
  ) {
    return this.sessionService.upsertSession(+id, updateSessionDto);
  }

  @Delete(':id')
  public removeSession(@Param('id') id: string) {
    return this.sessionService.removeSession(+id);
  }
}
