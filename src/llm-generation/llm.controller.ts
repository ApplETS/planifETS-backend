import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags
} from '@nestjs/swagger';
import type { Response } from 'express';

import { ChatbotEnabledGuard } from '../common/guards/chatbot-enabled.guard';
import { GenerateStreamDto, StatusResponseDto } from './dtos/generate.dto';
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

  @Get('recommend/stream')
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary:
      '🟢 Stream course recommendations from a natural language prompt via Server-Sent Events. ' +
      'Emits "status" events for course retrieval and AI generation, "reason" events ' +
      'with JSON-encoded incremental explanation strings, followed by a single ' +
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
    const controller = new AbortController();
    const onClose = () => controller.abort();
    response.once('close', onClose);
    const generator = this.llmService.recommendStream(
      query.prompt,
      parseProgramIds(query.programIds),
      controller.signal
    );
    let eventId = 0;

    const writeEvent = (type: string, data: unknown) => {
      eventId += 1;
      // Encode reason tokens, including numbers, quotes, and newlines, as strings.
      const payload =
        type === 'reason' || typeof data !== 'string'
          ? JSON.stringify(data)
          : data;
      const dataLines = payload
        .split(/\r\n|\r|\n/)
        .map((line) => `data: ${line}`)
        .join('\n');
      response.write(`event: ${type}\nid: ${eventId}\n${dataLines}\n\n`);
    };

    try {
      // Start the generator before committing SSE headers to preserve early HTTP errors.
      const first = await generator.next();
      if (controller.signal.aborted) return;
      // Declare UTF-8 explicitly so browsers preserve non-ASCII text.
      response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('X-Accel-Buffering', 'no');
      response.flushHeaders();
      if (!first.done) writeEvent(first.value.type, first.value.data);
      for await (const event of generator) {
        if (controller.signal.aborted) break;
        writeEvent(event.type, event.data);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (!response.headersSent) throw error;
      const message = error instanceof Error ? error.message : String(error);
      writeEvent('error', message);
    } finally {
      controller.abort();
      response.off('close', onClose);
      await generator.return(undefined);
      if (response.headersSent && !response.destroyed) response.end();
    }
  }
}
