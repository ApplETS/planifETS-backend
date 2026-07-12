import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags
} from '@nestjs/swagger';
import type { Response } from 'express';

import { ChatbotEnabledGuard } from '../common/guards/chatbot-enabled.guard';
import {
  GenerateDto,
  GenerateResponseDto,
  GenerateStreamDto,
  StatusResponseDto
} from './dtos/generate.dto';
import { LlmService } from './llm.service';

function parseProgramIds(raw?: string): number[] | undefined {
  if (!raw) {
    return undefined;
  }

  const ids = raw
    .split(';')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id));

  return ids.length > 0 ? ids : undefined;
}

@ApiTags('Chatbot')
@Controller('chatbot')
@UseGuards(ChatbotEnabledGuard)
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check the status of all configured LLM providers' })
  @ApiOkResponse({ type: StatusResponseDto })
  public async status(): Promise<StatusResponseDto> {
    const providers = await this.llmService.checkStatus();
    return { providers };
  }

  @Post('recommend')
  @HttpCode(200)
  @ApiOperation({
    summary: '🟢 Generate course recommendations from a natural language prompt'
  })
  @ApiOkResponse({ type: GenerateResponseDto })
  public async recommend(
    @Body() body: GenerateDto
  ): Promise<GenerateResponseDto> {
    return this.llmService.recommend(body.prompt, body.programIds);
  }

  @Get('recommend/stream')
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary:
      '🟢 Stream course recommendations from a natural language prompt via Server-Sent Events. ' +
      'Emits "reason" events with incremental explanation text, followed by a single ' +
      '"courses" event carrying the final course code list.',
    description:
      'Note: Swagger UI does not natively support Server-Sent Events, so the "Try it out" ' +
      'button here may not display the streamed response correctly (it may hang or show ' +
      'nothing). Test this endpoint with a real EventSource client or curl instead.'
  })
  public async recommendStream(
    @Query() query: GenerateStreamDto,
    @Res() response: Response
  ): Promise<void> {
    // Nest's built-in @Sse() decorator hardcodes 'Content-Type: text/event-stream'
    // with no charset, which makes browsers guess (and mangle non-ASCII text).
    // Streaming manually lets us declare UTF-8 explicitly.
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    const generator = this.llmService.recommendStream(
      query.prompt,
      parseProgramIds(query.programIds)
    );
    let eventId = 0;

    const writeEvent = (type: string, data: unknown) => {
      eventId += 1;
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      const dataLines = payload
        .split(/\r\n|\r|\n/)
        .map((line) => `data: ${line}`)
        .join('\n');
      response.write(`event: ${type}\nid: ${eventId}\n${dataLines}\n\n`);
    };

    response.req.on('close', () => {
      void generator.return?.(undefined);
    });

    try {
      for await (const event of generator) {
        writeEvent(event.type, event.data);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeEvent('error', message);
    } finally {
      response.end();
    }
  }
}
