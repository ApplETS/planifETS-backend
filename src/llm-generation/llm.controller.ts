import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GenerateDto, GenerateResponseDto, StatusResponseDto } from './dtos/generate.dto';
import { LlmService } from './llm.service';

@ApiTags('Chatbot')
@Controller('chatbot')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check the status of all configured LLM providers' })
  @ApiOkResponse({ type: StatusResponseDto })
  public async status(): Promise<StatusResponseDto> {
    const providers = await this.llmService.checkStatus();
    return { providers };
  }

  @Post('generate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate course recommendations from a natural language prompt' })
  @ApiOkResponse({ type: GenerateResponseDto })
  public async generate(@Body() body: GenerateDto): Promise<GenerateResponseDto> {
    return this.llmService.generate(body.prompt);
  }
}
