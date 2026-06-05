import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

import { BGE_M3_VECTOR_SIZE } from './embedding.constants';
import { CourseEmbeddingPayload } from './embedding-course.mapper';
import {
  getNestedProperty,
  isNotFoundError,
  isRecord,
  retryTransient,
} from './qdrant-error.util';

export interface CourseQdrantPoint {
  id: string;
  vector: number[];
  payload: CourseEmbeddingPayload;
}

type QdrantUpsertPoint = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

type VectorConfig = {
  size: number;
  distance: string;
};

@Injectable()
export class QdrantCourseIndexService {
  private readonly logger = new Logger(QdrantCourseIndexService.name);
  private readonly client: QdrantClient;
  private readonly collectionName: string;

  constructor() {
    this.collectionName = process.env.QDRANT_COLLECTION ?? 'courses_bge_m3';

    const url = process.env.QDRANT_URL ?? 'http://localhost:6333';
    const apiKey = process.env.QDRANT_API_KEY;

    this.client = apiKey
      ? new QdrantClient({ url, apiKey })
      : new QdrantClient({ url });
  }

  public async ensureCollection(): Promise<void> {
    try {
      const info = await this.client.getCollection(this.collectionName);

      this.validateCollection(info);

      this.logger.log(`Qdrant collection already exists: ${this.collectionName}`);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }

      this.logger.log(`Creating Qdrant collection: ${this.collectionName}`);

      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: BGE_M3_VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
    }
  }

  public async getExistingTextHashes(): Promise<Map<string, string>> {
    const hashes = new Map<string, string>();
    let nextOffset: string | number | undefined = undefined;

    do {
      const response = await this.client.scroll(this.collectionName, {
        offset: nextOffset,
        limit: 250,
        with_payload: ['text_hash'],
        with_vector: false,
      });

      for (const point of response.points) {
        const hash = (point.payload as Record<string, unknown>)?.text_hash;
        if (typeof point.id === 'string' && typeof hash === 'string') {
          hashes.set(point.id, hash);
        }
      }

      const raw = response.next_page_offset;
      nextOffset = typeof raw === 'string' || typeof raw === 'number' ? raw : undefined;
    } while (nextOffset !== undefined && nextOffset !== null);

    return hashes;
  }

  public async search(
    vector: number[],
    options: { limit: number; scoreThreshold: number; filter?: object },
  ): Promise<Array<{ payload: CourseEmbeddingPayload; score: number }>> {
    const results = await this.client.search(this.collectionName, {
      vector,
      limit: options.limit,
      score_threshold: options.scoreThreshold,
      filter: options.filter as Parameters<typeof this.client.search>[1]['filter'],
      with_payload: true,
    });

    return results.map((result) => ({
      payload: result.payload as unknown as CourseEmbeddingPayload,
      score: result.score,
    }));
  }

  public async upsertPoints(points: CourseQdrantPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    const qdrantPoints = points.map(toQdrantUpsertPoint);

    this.logger.debug(`Upserting ${qdrantPoints.length} points to collection ${this.collectionName}`);

    try {
      await retryTransient(
        () =>
          this.client.upsert(this.collectionName, {
            wait: true,
            points: qdrantPoints,
          }),
        3,
        1000,
      );
      this.logger.debug(`Successfully upserted ${qdrantPoints.length} points`);
    } catch (error) {
      this.logger.error(`Failed to upsert ${qdrantPoints.length} points: ${error}`);
      throw error;
    }
  }

  private validateCollection(info: unknown): void {
    const vectors = extractVectorsConfig(info);

    if (!vectors) {
      throw new Error(
        `Cannot read vector configuration for collection ${this.collectionName}.`,
      );
    }

    if (vectors.size !== BGE_M3_VECTOR_SIZE) {
      throw new Error(
        `Invalid Qdrant vector size for ${this.collectionName}: got ${vectors.size}, expected ${BGE_M3_VECTOR_SIZE}.`,
      );
    }

    if (vectors.distance.toLowerCase() !== 'cosine') {
      throw new Error(
        `Invalid Qdrant distance for ${this.collectionName}: got ${vectors.distance}, expected Cosine.`,
      );
    }
  }
}

function toQdrantUpsertPoint(point: CourseQdrantPoint): QdrantUpsertPoint {
  return {
    id: point.id,
    vector: point.vector,
    payload: {
      ...point.payload,
    },
  };
}

function extractVectorsConfig(info: unknown): VectorConfig | undefined {
  const vectors =
    getNestedProperty(info, ['config', 'params', 'vectors']) ??
    getNestedProperty(info, ['result', 'config', 'params', 'vectors']);

  return parseVectorConfig(vectors);
}

function parseVectorConfig(value: unknown): VectorConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const size = value.size;
  const distance = value.distance;

  if (typeof size !== 'number') {
    return undefined;
  }

  if (typeof distance !== 'string') {
    return undefined;
  }

  return {
    size,
    distance,
  };
}
