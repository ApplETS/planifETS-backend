import { Module } from '@nestjs/common';

import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

@Module({
  controllers: [LlmController],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmGenerationModule {}
