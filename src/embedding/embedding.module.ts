import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingController } from './embedding.controller';
import { EmbeddingService } from './embedding.service';
import { CourseEmbeddingIndexerService } from './embedding-course-indexer.service';
import { EmbeddingWorkerClient } from './embedding-worker.client';
import { QdrantCourseIndexService } from './qdrant-course-index.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmbeddingController],
  providers: [
    EmbeddingService,
    CourseEmbeddingIndexerService,
    EmbeddingWorkerClient,
    QdrantCourseIndexService,
  ],
  exports: [
    EmbeddingService,
    CourseEmbeddingIndexerService,
  ],
})
export class EmbeddingModule {}
