import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingController } from './embedding.controller';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmbeddingController],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
