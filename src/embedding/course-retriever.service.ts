import { Injectable } from '@nestjs/common';

import { buildQueryEmbeddingText } from '../common/api-helper/embedding/embedding-text';
import { EmbeddingWorkerClient } from './embedding-worker.client';
import { QdrantCourseIndexService } from './qdrant-course-index.service';
import { isTransientError } from './qdrant-error.util';

interface UserSessionContext {
  programIds?: number[];
  cycle?: number;
}

interface CourseResult {
  code: string;
  title: string;
  description: string;
  score: number;
  prerequisite_codes: string[];
}

// Qdrant stores one point per (course, program) pair. Oversampling before deduplication
// ensures we return up to LIMIT unique course codes even when duplicates consume slots.
const LIMIT = 10;
const OVERSAMPLE_FACTOR = 5;
const SCORE_THRESHOLD = 0.4;

@Injectable()
export class CourseRetrieverService {
  constructor(
    private readonly worker: EmbeddingWorkerClient,
    private readonly qdrant: QdrantCourseIndexService
  ) {}

  public async retrieveCourses(
    query: string,
    context?: UserSessionContext
  ): Promise<CourseResult[]> {
    try {
      const vectors = await this.worker.embed([buildQueryEmbeddingText(query)]);
      const vector = vectors[0];
      const filter = context ? buildPayloadFilter(context) : undefined;

      const hits = await this.qdrant.search(vector, {
        limit: LIMIT * OVERSAMPLE_FACTOR,
        scoreThreshold: SCORE_THRESHOLD,
        filter
      });

      const best = new Map<string, CourseResult>();
      for (const { payload, score } of hits) {
        const existing = best.get(payload.code);
        if (!existing || score > existing.score) {
          best.set(payload.code, {
            code: payload.code,
            title: payload.title,
            description: payload.description,
            score,
            prerequisite_codes: payload.prerequisite_codes
          });
        }
      }

      return [...best.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT);
    } catch (error) {
      if (isTransientError(error)) {
        return [];
      }

      throw error;
    }
  }
}

function buildPayloadFilter(context: UserSessionContext): object | undefined {
  const must: object[] = [];

  if (context.programIds?.length) {
    must.push({ key: 'program_id', match: { any: context.programIds } });
  }

  if (context.cycle !== undefined) {
    must.push({ key: 'cycle', match: { value: context.cycle } });
  }

  return must.length > 0 ? { must } : undefined;
}
