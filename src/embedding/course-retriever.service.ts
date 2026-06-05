import { Injectable } from '@nestjs/common';

import { EmbeddingWorkerClient } from './embedding-worker.client';
import { QdrantCourseIndexService } from './qdrant-course-index.service';

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

// BGE-M3 is trained asymmetrically: queries use an instruction prefix, indexed documents do not.
// This closes the semantic gap between query phrasing and document vocabulary.
const QUERY_INSTRUCTION =
  'Represent this query for searching relevant educational course information: ';

// Qdrant stores one point per (course, program) pair. Oversampling before deduplication
// ensures we return up to LIMIT unique course codes even when duplicates consume slots.
const LIMIT = 10;
const OVERSAMPLE_FACTOR = 5;
const SCORE_THRESHOLD = 0.4;

@Injectable()
export class CourseRetrieverService {
  constructor(
    private readonly worker: EmbeddingWorkerClient,
    private readonly qdrant: QdrantCourseIndexService,
  ) {}

  public async retrieveCourses(query: string, context?: UserSessionContext): Promise<CourseResult[]> {
    const vectors = await this.worker.embed([QUERY_INSTRUCTION + query]);
    const vector = vectors[0];
    const filter = context ? buildPayloadFilter(context) : undefined;

    const hits = await this.qdrant.search(vector, {
      limit: LIMIT * OVERSAMPLE_FACTOR,
      scoreThreshold: SCORE_THRESHOLD,
      filter,
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
          prerequisite_codes: payload.prerequisite_codes,
        });
      }
    }

    return [...best.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT);
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
