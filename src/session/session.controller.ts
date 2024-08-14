import {
  Controller,
  Get,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Session } from '@prisma/client';

import { UuidDto } from '../common/exceptions/dtos/uuid.dto';
import { SessionService } from './session.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  public async getSession(@Param() { id }: UuidDto): Promise<Session | null> {
    return this.sessionService.getSession(id);
  }

  @Get()
  public async getAllSessions(): Promise<Session[]> {
    return this.sessionService.getAllSessions();
  }
}
