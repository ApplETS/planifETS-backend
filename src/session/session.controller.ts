import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session, Trimester } from '@prisma/client';

import { SessionService } from './session.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiQuery({
    name: 'trimester',
    enum: Trimester,
  })
  public async getSession(
    @Query('year') year: string,
    @Query('trimester') trimester: string,
  ): Promise<Session | null> {
    const parsedTrimester = Trimester[trimester as keyof typeof Trimester];
    if (!parsedTrimester) {
      throw new BadRequestException(
        `Invalid trimester value. Allowed: ${Object.values(Trimester).join(', ')}`,
      );
    }

    return this.sessionService.getOrCreateSession(
      Number(year),
      parsedTrimester,
    );
  }
}
