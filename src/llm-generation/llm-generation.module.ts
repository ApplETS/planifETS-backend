import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ChatbotEnabledGuard } from '../common/guards/chatbot-enabled.guard';
import chatbotConfig from '../config/chatbot.config';
import { EmbeddingModule } from '../embedding/embedding.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';

@Module({
  imports: [
    EmbeddingModule,
    MonitoringModule,
    ConfigModule.forFeature(chatbotConfig)
  ],
  controllers: [LlmController],
  providers: [LlmService, ChatbotEnabledGuard],
  exports: [LlmService]
})
export class LlmGenerationModule {}
