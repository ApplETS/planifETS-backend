import { Module } from '@nestjs/common';

import { EmbeddingModule } from '../embedding/embedding.module';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

@Module({
  imports: [EmbeddingModule],
  controllers: [LlmController],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmGenerationModule {}
