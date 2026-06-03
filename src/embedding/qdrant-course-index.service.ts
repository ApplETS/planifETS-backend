import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

import {
  BGE_M3_VECTOR_SIZE,
  CourseEmbeddingPayload,
} from './embedding-course.mapper';

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

  public async upsertPoints(points: CourseQdrantPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    const qdrantPoints = points.map(toQdrantUpsertPoint);

    await retryTransient(
      () =>
        this.client.upsert(this.collectionName, {
          wait: true,
          points: qdrantPoints,
        }),
      3,
      1000,
    );
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

async function retryTransient<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  delayMs: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientError(error) || attempt === maxAttempts) {
        throw error;
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

function isNotFoundError(error: unknown): boolean {
  return getStatusCode(error) === 404;
}

function isTransientError(error: unknown): boolean {
  const status = getStatusCode(error);
  const code = getErrorCode(error);

  return (
    status === 408 ||
    status === 429 ||
    isServerErrorStatus(status) ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT'
  );
}

function isServerErrorStatus(status: number | undefined): boolean {
  return typeof status === 'number' && status >= 500;
}

function getStatusCode(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const status = error.status;

  if (typeof status === 'number') {
    return status;
  }

  const statusCode = error.statusCode;

  if (typeof statusCode === 'number') {
    return statusCode;
  }

  const response = error.response;

  if (isRecord(response) && typeof response.status === 'number') {
    return response.status;
  }

  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function getNestedProperty(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((currentValue, key) => {
    if (!isRecord(currentValue)) {
      return undefined;
    }

    return currentValue[key];
  }, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
