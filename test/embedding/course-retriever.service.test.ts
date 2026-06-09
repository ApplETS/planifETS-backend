import { CourseRetrieverService } from '../../src/embedding/course-retriever.service';
import { EmbeddingWorkerClient } from '../../src/embedding/embedding-worker.client';
import { QdrantCourseIndexService } from '../../src/embedding/qdrant-course-index.service';

const MOCK_VECTOR = Array.from({ length: 1024 }, () => 0.1);

const QUERY_INSTRUCTION =
  'Represent this query for searching relevant educational course information: ';

const makeQdrantHit = (
  code: string,
  score: number,
  overrides: Partial<{
    title: string;
    description: string;
    prerequisite_codes: string[];
  }> = {},
) => ({
  payload: {
    code,
    title: overrides.title ?? `Titre de ${code}`,
    description: overrides.description ?? `Description de ${code}.`,
    prerequisite_codes: overrides.prerequisite_codes ?? [],
    course_id: 1,
    program_id: 182848,
    embedding_id: `${code}_182848`,
    program_title: 'Génie logiciel',
    has_prerequisites: false,
    availability: ['JOUR'],
    sessions: ['Automne 2026'],
    text: '',
    text_hash: '',
    embedding_model: 'Xenova/bge-m3',
    indexed_at: '2026-01-01T00:00:00.000Z',
  },
  score,
});

describe('CourseRetrieverService', () => {
  let service: CourseRetrieverService;
  let workerMock: { embed: jest.Mock };
  let qdrantMock: { search: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    workerMock = { embed: jest.fn().mockResolvedValue([MOCK_VECTOR]) };
    qdrantMock = { search: jest.fn().mockResolvedValue([]) };

    service = new CourseRetrieverService(
      workerMock as unknown as EmbeddingWorkerClient,
      qdrantMock as unknown as QdrantCourseIndexService,
    );
  });

  describe('retrieveCourses', () => {
    it('prepends the BGE-M3 query instruction before embedding', async () => {
      await service.retrieveCourses('bases de données');

      expect(workerMock.embed).toHaveBeenCalledWith([
        QUERY_INSTRUCTION + 'bases de données',
      ]);
    });

    it('calls qdrant.search with the embedded vector', async () => {
      await service.retrieveCourses('IA');

      expect(qdrantMock.search).toHaveBeenCalledWith(
        MOCK_VECTOR,
        expect.objectContaining({ limit: 50, scoreThreshold: 0.4 }),
      );
    });

    it('passes no filter when context is absent', async () => {
      await service.retrieveCourses('IA');

      expect(qdrantMock.search).toHaveBeenCalledWith(
        MOCK_VECTOR,
        expect.objectContaining({ filter: undefined }),
      );
    });

    it('passes no filter when context has no programIds and no cycle', async () => {
      await service.retrieveCourses('IA', {});

      expect(qdrantMock.search).toHaveBeenCalledWith(
        MOCK_VECTOR,
        expect.objectContaining({ filter: undefined }),
      );
    });

    it('filters by program_id when context.programIds is provided', async () => {
      await service.retrieveCourses('IA', { programIds: [182848] });

      expect(qdrantMock.search).toHaveBeenCalledWith(
        MOCK_VECTOR,
        expect.objectContaining({
          filter: { must: [{ key: 'program_id', match: { any: [182848] } }] },
        }),
      );
    });

    it('filters by cycle when context.cycle is provided', async () => {
      await service.retrieveCourses('IA', { cycle: 1 });

      expect(qdrantMock.search).toHaveBeenCalledWith(
        MOCK_VECTOR,
        expect.objectContaining({
          filter: { must: [{ key: 'cycle', match: { value: 1 } }] },
        }),
      );
    });

    it('filters by both program_id and cycle when full context is provided', async () => {
      await service.retrieveCourses('IA', { programIds: [182848], cycle: 1 });

      expect(qdrantMock.search).toHaveBeenCalledWith(
        MOCK_VECTOR,
        expect.objectContaining({
          filter: {
            must: [
              { key: 'program_id', match: { any: [182848] } },
              { key: 'cycle', match: { value: 1 } },
            ],
          },
        }),
      );
    });

    it('returns empty array when Qdrant returns no results', async () => {
      qdrantMock.search.mockResolvedValue([]);

      const result = await service.retrieveCourses('recette de pâtes à ravioli');

      expect(result).toEqual([]);
    });

    it('deduplicates by course code, keeping the highest-score hit', async () => {
      qdrantMock.search.mockResolvedValue([
        makeQdrantHit('LOG635', 0.85),
        makeQdrantHit('LOG635', 0.72), // same code, lower score — should be dropped
        makeQdrantHit('LOG660', 0.78),
      ]);

      const result = await service.retrieveCourses('IA');

      expect(result).toHaveLength(2);
      const log635 = result.find((r) => r.code === 'LOG635');
      expect(log635?.score).toBe(0.85);
    });

    it('returns at most 10 results even when Qdrant returns 30', async () => {
      const hits = Array.from({ length: 30 }, (_, i) =>
        makeQdrantHit(`LOG${String(i).padStart(3, '0')}`, 0.9 - i * 0.01),
      );
      qdrantMock.search.mockResolvedValue(hits);

      const result = await service.retrieveCourses('IA');

      expect(result).toHaveLength(10);
    });

    it('returns results sorted by score descending after deduplication', async () => {
      qdrantMock.search.mockResolvedValue([
        makeQdrantHit('LOG660', 0.78),
        makeQdrantHit('LOG635', 0.85),
        makeQdrantHit('LOG200', 0.71),
      ]);

      const result = await service.retrieveCourses('IA');

      expect(result.map((r) => r.code)).toEqual(['LOG635', 'LOG660', 'LOG200']);
    });

    it('maps hits to CourseResult with correct fields', async () => {
      qdrantMock.search.mockResolvedValue([
        makeQdrantHit('LOG635', 0.91, {
          title: 'Systèmes intelligents',
          description: 'Description.',
          prerequisite_codes: ['LOG121'],
        }),
      ]);

      const result = await service.retrieveCourses('IA');

      expect(result[0]).toEqual({
        code: 'LOG635',
        title: 'Systèmes intelligents',
        description: 'Description.',
        score: 0.91,
        prerequisite_codes: ['LOG121'],
      });
    });

    it('propagates errors from the embedding worker', async () => {
      workerMock.embed.mockRejectedValue(new Error('Worker timeout'));

      await expect(service.retrieveCourses('IA')).rejects.toThrow('Worker timeout');
    });

    it('propagates errors from Qdrant search', async () => {
      qdrantMock.search.mockRejectedValue(new Error('Qdrant unavailable'));

      await expect(service.retrieveCourses('IA')).rejects.toThrow('Qdrant unavailable');
    });
  });
});
