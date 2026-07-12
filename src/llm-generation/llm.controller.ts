import {
  Body,
  Controller,
  Get,
  HttpCode,
  MessageEvent,
  Post,
  Query,
  Sse,
  UseGuards
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags
} from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { ChatbotEnabledGuard } from '../common/guards/chatbot-enabled.guard';
import {
  GenerateDto,
  GenerateResponseDto,
  StatusResponseDto
} from './dtos/generate.dto';
import { LlmService } from './llm.service';

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
    summary: 'Generate course recommendations from a natural language prompt'
  })
  @ApiOkResponse({ type: GenerateResponseDto })
  public async recommend(
    @Body() body: GenerateDto
  ): Promise<GenerateResponseDto> {
    return this.llmService.recommend(body.prompt);
  }

  @Sse('recommend/stream')
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary:
      'Stream course recommendations from a natural language prompt via Server-Sent Events. ' +
      'Emits "reason" events with incremental explanation text, followed by a single ' +
      '"courses" event carrying the final course code list.'
  })
  public recommendStream(@Query() query: GenerateDto): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const generator = this.llmService.recommendStream(query.prompt);

      (async () => {
        try {
          for await (const event of generator) {
            subscriber.next({ type: event.type, data: event.data });
          }
          subscriber.complete();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          subscriber.next({ type: 'error', data: message });
          subscriber.complete();
        }
      })();

      return () => {
        void generator.return?.(undefined);
      };
    });
  }
}
