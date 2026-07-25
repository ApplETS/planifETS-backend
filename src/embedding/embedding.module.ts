import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ChatbotEnabledGuard } from '../common/guards/chatbot-enabled.guard';
import chatbotConfig from '../config/chatbot.config';
import { PrismaModule } from '../prisma/prisma.module';
import { CourseRetrieverService } from './course-retriever.service';
import { EmbeddingController } from './embedding.controller';
import { EmbeddingService } from './embedding.service';
import { CourseEmbeddingIndexerService } from './embedding-course-indexer.service';
import { EmbeddingWorkerClient } from './embedding-worker.client';
import { QdrantCourseIndexService } from './qdrant-course-index.service';
import { RetrievalController } from './retrieval.controller';

@Module({
  imports: [PrismaModule, ConfigModule.forFeature(chatbotConfig)],
  controllers: [EmbeddingController, RetrievalController],
  providers: [
    EmbeddingService,
    CourseEmbeddingIndexerService,
    EmbeddingWorkerClient,
    QdrantCourseIndexService,
    CourseRetrieverService,
    ChatbotEnabledGuard
  ],
  exports: [
    EmbeddingService,
    CourseEmbeddingIndexerService,
    QdrantCourseIndexService,
    CourseRetrieverService
  ]
})
export class EmbeddingModule {}
