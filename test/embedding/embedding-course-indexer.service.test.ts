import { EmbeddingViewDto } from '../../src/embedding/dtos/embedding-view.dto';
import { BGE_M3_VECTOR_SIZE } from '../../src/embedding/embedding.constants';
import { EmbeddingService } from '../../src/embedding/embedding.service';
import { computeCourseChangeKey } from '../../src/embedding/embedding-course.mapper';
import { CourseEmbeddingIndexerService } from '../../src/embedding/embedding-course-indexer.service';
import { EmbeddingWorkerClient } from '../../src/embedding/embedding-worker.client';
import { QdrantCourseIndexService } from '../../src/embedding/qdrant-course-index.service';

const makeVector = (): number[] => Array.from({ length: BGE_M3_VECTOR_SIZE }, () => 0.1);

const buildRow = (overrides: Partial<EmbeddingViewDto> = {}): EmbeddingViewDto => ({
  embedding_id: '352507_182848',
  course_id: 352507,
  program_id: 182848,
  code: 'LOG635',
  title: 'Systèmes intelligents',
  description: 'Description.',
  cycle: 1,
  program_title: 'Génie logiciel',
  type: 'TRONC',
  typical_session_index: 5,
  unstructured_prerequisite: null,
  prerequisite_codes: [],
  has_prerequisites: false,
  availability: ['JOUR'],
  sessions: ['Automne 2026'],
  ...overrides,
});

describe('CourseEmbeddingIndexerService', () => {
  let service: CourseEmbeddingIndexerService;
  let embeddingServiceMock: { findAll: jest.Mock };
  let workerClientMock: { embed: jest.Mock };
  let qdrantMock: {
    ensureCollection: jest.Mock;
    getExistingTextHashes: jest.Mock;
    upsertPoints: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    embeddingServiceMock = { findAll: jest.fn() };
    workerClientMock = { embed: jest.fn() };
    qdrantMock = {
      ensureCollection: jest.fn().mockResolvedValue(undefined),
      getExistingTextHashes: jest.fn().mockResolvedValue(new Map()),
      upsertPoints: jest.fn().mockResolvedValue(undefined),
    };

    service = new CourseEmbeddingIndexerService(
      embeddingServiceMock as unknown as EmbeddingService,
      workerClientMock as unknown as EmbeddingWorkerClient,
      qdrantMock as unknown as QdrantCourseIndexService,
    );

    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  describe('run — happy path', () => {
    it('ensures the Qdrant collection before doing any work', async () => {
      embeddingServiceMock.findAll.mockResolvedValue([]);
      await service.run();
      expect(qdrantMock.ensureCollection).toHaveBeenCalledTimes(1);
    });

    it('fetches all rows and existing hashes in parallel', async () => {
      embeddingServiceMock.findAll.mockResolvedValue([]);
      await service.run();
      expect(embeddingServiceMock.findAll).toHaveBeenCalledTimes(1);
      expect(qdrantMock.getExistingTextHashes).toHaveBeenCalledTimes(1);
    });

    it('does not embed or upsert when there are no rows', async () => {
      embeddingServiceMock.findAll.mockResolvedValue([]);
      await service.run();
      expect(workerClientMock.embed).not.toHaveBeenCalled();
      expect(qdrantMock.upsertPoints).not.toHaveBeenCalled();
    });

    it('indexes a new row that is not yet in Qdrant', async () => {
      const row = buildRow();
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      workerClientMock.embed.mockResolvedValue([makeVector()]);

      await service.run();

      expect(qdrantMock.upsertPoints).toHaveBeenCalledTimes(1);
      const [points] = qdrantMock.upsertPoints.mock.calls[0] as [{ vector: number[] }[]];
      expect(points).toHaveLength(1);
      expect(points[0].vector).toHaveLength(BGE_M3_VECTOR_SIZE);
    });
  });

  describe('run — change detection', () => {
    it('skips a row whose hash already matches what is stored in Qdrant', async () => {
      const row = buildRow();
      const { id, hash } = computeCourseChangeKey(row);
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      qdrantMock.getExistingTextHashes.mockResolvedValue(new Map([[id, hash]]));

      await service.run();

      expect(workerClientMock.embed).not.toHaveBeenCalled();
      expect(qdrantMock.upsertPoints).not.toHaveBeenCalled();
    });

    it('re-indexes a row when its stored hash is stale', async () => {
      const row = buildRow();
      const { id } = computeCourseChangeKey(row);
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      qdrantMock.getExistingTextHashes.mockResolvedValue(new Map([[id, 'old-hash']]));
      workerClientMock.embed.mockResolvedValue([makeVector()]);

      await service.run();

      expect(qdrantMock.upsertPoints).toHaveBeenCalledTimes(1);
    });
  });

  describe('run — batching', () => {
    it('processes rows in batches according to EMBEDDING_BATCH_SIZE', async () => {
      const rows = [
        buildRow({ embedding_id: '1_1', course_id: 1, code: 'LOG001' }),
        buildRow({ embedding_id: '2_1', course_id: 2, code: 'LOG002' }),
        buildRow({ embedding_id: '3_1', course_id: 3, code: 'LOG003' }),
      ];
      embeddingServiceMock.findAll.mockResolvedValue(rows);
      process.env.EMBEDDING_BATCH_SIZE = '2';
      workerClientMock.embed
        .mockResolvedValueOnce([makeVector(), makeVector()])
        .mockResolvedValueOnce([makeVector()]);

      await service.run();

      expect(workerClientMock.embed).toHaveBeenCalledTimes(2);
      delete process.env.EMBEDDING_BATCH_SIZE;
    });

    it('uses the default batch size of 50 when EMBEDDING_BATCH_SIZE is unset', async () => {
      delete process.env.EMBEDDING_BATCH_SIZE;
      const rows = Array.from({ length: 3 }, (_, i) =>
        buildRow({ embedding_id: `${i}_1`, course_id: i, code: `LOG00${i}` }),
      );
      embeddingServiceMock.findAll.mockResolvedValue(rows);
      workerClientMock.embed.mockResolvedValue(rows.map(makeVector));

      await service.run();

      expect(workerClientMock.embed).toHaveBeenCalledTimes(1);
    });

    it('falls back to default batch size when EMBEDDING_BATCH_SIZE is not a positive integer', async () => {
      process.env.EMBEDDING_BATCH_SIZE = 'invalid';
      const row = buildRow();
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      workerClientMock.embed.mockResolvedValue([makeVector()]);

      await service.run();

      expect(workerClientMock.embed).toHaveBeenCalledTimes(1);
      delete process.env.EMBEDDING_BATCH_SIZE;
    });
  });

  describe('run — batch embed failure falls back to one-by-one', () => {
    it('retries each item individually when the batch embed call throws', async () => {
      const row = buildRow();
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      workerClientMock.embed
        .mockRejectedValueOnce(new Error('batch failed'))
        .mockResolvedValueOnce([makeVector()]);

      await service.run();

      expect(workerClientMock.embed).toHaveBeenCalledTimes(2);
      expect(qdrantMock.upsertPoints).toHaveBeenCalledTimes(1);
    });

    it('skips an item and continues when its individual embed fails', async () => {
      const rows = [
        buildRow({ embedding_id: '1_1', course_id: 1, code: 'LOG001' }),
        buildRow({ embedding_id: '2_1', course_id: 2, code: 'LOG002' }),
      ];
      embeddingServiceMock.findAll.mockResolvedValue(rows);
      workerClientMock.embed
        .mockRejectedValueOnce(new Error('batch failed'))
        .mockRejectedValueOnce(new Error('item 1 embed failed'))
        .mockResolvedValueOnce([makeVector()]);

      await service.run();

      // batch fail + item1 fail + item2 success
      expect(workerClientMock.embed).toHaveBeenCalledTimes(3);
      expect(qdrantMock.upsertPoints).toHaveBeenCalledTimes(1);
    });

    it('throws and stops when upsert fails during one-by-one processing', async () => {
      const row = buildRow();
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      workerClientMock.embed
        .mockRejectedValueOnce(new Error('batch failed'))
        .mockResolvedValueOnce([makeVector()]);
      qdrantMock.upsertPoints.mockRejectedValue(new Error('upsert failed'));

      await expect(service.run()).rejects.toThrow('upsert failed');
    });
  });

  describe('run — upsert failure', () => {
    it('throws and stops the job when upsertPoints fails on a batch', async () => {
      const row = buildRow();
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      workerClientMock.embed.mockResolvedValue([makeVector()]);
      qdrantMock.upsertPoints.mockRejectedValue(new Error('qdrant down'));

      await expect(service.run()).rejects.toThrow('qdrant down');
    });
  });

  describe('run — embed output validation', () => {
    it('falls back to one-by-one and skips the row when embed count mismatches', async () => {
      const row = buildRow();
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      // Always returns 2 vectors for 1 item — mismatch at both batch and item level
      workerClientMock.embed.mockResolvedValue([makeVector(), makeVector()]);

      await expect(service.run()).resolves.toBeUndefined();
      expect(qdrantMock.upsertPoints).not.toHaveBeenCalled();
    });

    it('falls back to one-by-one and skips the row when vector size is wrong', async () => {
      const row = buildRow();
      embeddingServiceMock.findAll.mockResolvedValue([row]);
      // Returns a 512-dim vector instead of the required 1024
      workerClientMock.embed.mockResolvedValue([Array.from({ length: 512 }, () => 0.1)]);

      await expect(service.run()).resolves.toBeUndefined();
      expect(qdrantMock.upsertPoints).not.toHaveBeenCalled();
    });
  });
});
