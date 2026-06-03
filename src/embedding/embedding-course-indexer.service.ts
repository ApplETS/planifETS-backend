import { Injectable, Logger } from '@nestjs/common';

import { EmbeddingViewDto } from './dtos/embedding-view.dto';
import { EmbeddingService } from './embedding.service';
import {
  BGE_M3_VECTOR_SIZE,
  prepareCourseEmbedding,
  PreparedCourseEmbedding,
} from './embedding-course.mapper';
import { EmbeddingWorkerClient } from './embedding-worker.client';
import {
  CourseQdrantPoint,
  QdrantCourseIndexService,
} from './qdrant-course-index.service';

type IndexingCounters = {
  indexedCount: number;
  errorCount: number;
};

@Injectable()
export class CourseEmbeddingIndexerService {
  private readonly logger = new Logger(CourseEmbeddingIndexerService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly embeddingWorkerClient: EmbeddingWorkerClient,
    private readonly qdrantCourseIndexService: QdrantCourseIndexService,
  ) {}

  public async run(): Promise<void> {
    const startedAt = Date.now();
    const embeddingModel = process.env.EMBEDDING_MODEL ?? 'Xenova/bge-m3';
    const batchSize = parsePositiveInteger(process.env.EMBEDDING_BATCH_SIZE, 50);

    const counters: IndexingCounters = {
      indexedCount: 0,
      errorCount: 0,
    };

    this.logger.log(
      `Starting course embedding indexation. Model: ${embeddingModel}. Batch size: ${batchSize}.`,
    );

    await this.qdrantCourseIndexService.ensureCollection();

    const rows = await this.embeddingService.findAll();

    this.logger.log(`Loaded ${rows.length} rows from v_courses_for_embedding.`);

    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const rowsBatch = rows.slice(offset, offset + batchSize);

      await this.processRowsBatch(rowsBatch, embeddingModel, counters, offset);
    }

    const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(2);

    this.logger.log(
      `${counters.indexedCount} cours indexés en ${durationSeconds} secondes, ${counters.errorCount} erreurs.`,
    );
  }

  private async processRowsBatch(
    rowsBatch: EmbeddingViewDto[],
    embeddingModel: string,
    counters: IndexingCounters,
    offset: number,
  ): Promise<void> {
    const preparedBatch: PreparedCourseEmbedding[] = [];

    for (const row of rowsBatch) {
      try {
        preparedBatch.push(prepareCourseEmbedding(row, embeddingModel));
      } catch (error) {
        counters.errorCount += 1;

        this.logger.warn(
          `Skipping ${row.code}/${row.program_id}: mapper failed: ${formatError(error)}`,
        );
      }
    }

    if (preparedBatch.length === 0) {
      return;
    }

    let points: CourseQdrantPoint[];

    try {
      points = await this.embedPreparedBatch(preparedBatch);
    } catch (error) {
      this.logger.warn(
        `Embedding batch failed at offset ${offset}. Falling back to item-by-item. Error: ${formatError(error)}`,
      );

      await this.processPreparedBatchOneByOne(preparedBatch, counters);
      return;
    }

    try {
      await this.qdrantCourseIndexService.upsertPoints(points);
      counters.indexedCount += points.length;
    } catch (error) {
      this.logger.error(
        `Qdrant upsert failed at offset ${offset}. Stopping job. Error: ${formatError(error)}`,
      );

      throw error;
    }
  }

  private async processPreparedBatchOneByOne(
    preparedBatch: PreparedCourseEmbedding[],
    counters: IndexingCounters,
  ): Promise<void> {
    for (const prepared of preparedBatch) {
      let point: CourseQdrantPoint;

      try {
        const points = await this.embedPreparedBatch([prepared]);
        const firstPoint = points.at(0);

        if (!firstPoint) {
          throw new Error('No Qdrant point produced for single prepared course.');
        }

        point = firstPoint;
      } catch (error) {
        counters.errorCount += 1;

        this.logger.warn(
          `Skipping ${prepared.payload.code}/${prepared.payload.program_id}: embedding failed: ${formatError(error)}`,
        );

        continue;
      }

      try {
        await this.qdrantCourseIndexService.upsertPoints([point]);
        counters.indexedCount += 1;
      } catch (error) {
        this.logger.error(
          `Qdrant upsert failed for ${prepared.payload.code}/${prepared.payload.program_id}. Stopping job. Error: ${formatError(error)}`,
        );

        throw error;
      }
    }
  }

  private async embedPreparedBatch(
    preparedBatch: PreparedCourseEmbedding[],
  ): Promise<CourseQdrantPoint[]> {
    const vectors = await this.embeddingWorkerClient.embed(
      preparedBatch.map((prepared) => prepared.text),
    );

    if (vectors.length !== preparedBatch.length) {
      throw new Error(
        `Embedding count mismatch: got ${vectors.length}, expected ${preparedBatch.length}.`,
      );
    }

    return preparedBatch.map((prepared, index) => {
      const vector = vectors[index];

      if (!vector) {
        throw new Error(
          `Missing vector for ${prepared.payload.code}/${prepared.payload.program_id}.`,
        );
      }

      if (vector.length !== BGE_M3_VECTOR_SIZE) {
        throw new Error(
          `Invalid vector size for ${prepared.payload.code}/${prepared.payload.program_id}: got ${vector.length}, expected ${BGE_M3_VECTOR_SIZE}.`,
        );
      }

      return {
        id: prepared.id,
        vector,
        payload: prepared.payload,
      };
    });
  }
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}
