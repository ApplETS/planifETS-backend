import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  public create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionService.create(createSessionDto);
  }

  @Get()
  public findAll() {
    return this.sessionService.findAll();
  }

  @Get(':id')
  public findOne(@Param('id') id: string) {
    return this.sessionService.findOne(+id);
  }

  @Patch(':id')
  public update(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    return this.sessionService.update(+id, updateSessionDto);
  }

  @Delete(':id')
  public remove(@Param('id') id: string) {
    return this.sessionService.remove(+id);
  }
}
