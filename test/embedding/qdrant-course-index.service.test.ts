import { QdrantClient } from '@qdrant/js-client-rest';

import { BGE_M3_VECTOR_SIZE } from '../../src/embedding/embedding.constants';
import type { CourseQdrantPoint } from '../../src/embedding/qdrant-course-index.service';
import { QdrantCourseIndexService } from '../../src/embedding/qdrant-course-index.service';

jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn(),
}));

const makeValidCollectionInfo = () => ({
  config: {
    params: {
      vectors: { size: BGE_M3_VECTOR_SIZE, distance: 'Cosine' },
    },
  },
});

const makePoint = (id = 'uuid-1'): CourseQdrantPoint => ({
  id,
  vector: Array.from({ length: BGE_M3_VECTOR_SIZE }, () => 0.1),
  payload: {
    embedding_id: '352507_182848',
    course_id: 352507,
    program_id: 182848,
    code: 'LOG635',
    title: 'Systèmes intelligents',
    description: 'Description.',
    program_title: 'Génie logiciel',
    prerequisite_codes: [],
    has_prerequisites: false,
    availability: [],
    sessions: [],
    text: 'some text',
    text_hash: 'abc123',
    embedding_model: 'Xenova/bge-m3',
    indexed_at: '2025-01-01T00:00:00.000Z',
  },
});

describe('QdrantCourseIndexService', () => {
  let service: QdrantCourseIndexService;
  let mockClient: {
    getCollection: jest.Mock;
    createCollection: jest.Mock;
    scroll: jest.Mock;
    upsert: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      getCollection: jest.fn(),
      createCollection: jest.fn(),
      scroll: jest.fn(),
      upsert: jest.fn(),
    };

    (QdrantClient as jest.Mock).mockImplementation(() => mockClient);
    service = new QdrantCourseIndexService();

    jest.spyOn(service['logger'], 'log').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => {});
    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  describe('ensureCollection', () => {
    it('logs and skips creation when the collection already exists with valid config', async () => {
      mockClient.getCollection.mockResolvedValue(makeValidCollectionInfo());

      await expect(service.ensureCollection()).resolves.toBeUndefined();
      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it('creates the collection when getCollection throws a 404 error', async () => {
      mockClient.getCollection.mockRejectedValue({ status: 404 });
      mockClient.createCollection.mockResolvedValue(undefined);

      await service.ensureCollection();

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        expect.any(String),
        { vectors: { size: BGE_M3_VECTOR_SIZE, distance: 'Cosine' } },
      );
    });

    it('re-throws non-404 errors from getCollection', async () => {
      const error = { status: 500 };
      mockClient.getCollection.mockRejectedValue(error);

      await expect(service.ensureCollection()).rejects.toBe(error);
      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it('throws when the existing collection has the wrong vector size', async () => {
      mockClient.getCollection.mockResolvedValue({
        config: { params: { vectors: { size: 512, distance: 'Cosine' } } },
      });

      await expect(service.ensureCollection()).rejects.toThrow('Invalid Qdrant vector size');
    });

    it('throws when the existing collection has the wrong distance metric', async () => {
      mockClient.getCollection.mockResolvedValue({
        config: { params: { vectors: { size: BGE_M3_VECTOR_SIZE, distance: 'Dot' } } },
      });

      await expect(service.ensureCollection()).rejects.toThrow('Invalid Qdrant distance');
    });

    it('throws when the vector configuration cannot be read', async () => {
      mockClient.getCollection.mockResolvedValue({ config: {} });

      await expect(service.ensureCollection()).rejects.toThrow('Cannot read vector configuration');
    });

    it('also reads vector config from the result.config path', async () => {
      mockClient.getCollection.mockResolvedValue({
        result: {
          config: {
            params: {
              vectors: { size: BGE_M3_VECTOR_SIZE, distance: 'Cosine' },
            },
          },
        },
      });

      await expect(service.ensureCollection()).resolves.toBeUndefined();
    });
  });

  describe('getExistingTextHashes', () => {
    it('returns an empty map when there are no points', async () => {
      mockClient.scroll.mockResolvedValue({ points: [], next_page_offset: null });

      const result = await service.getExistingTextHashes();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('maps point id to its text_hash payload', async () => {
      mockClient.scroll.mockResolvedValue({
        points: [{ id: 'uuid-1', payload: { text_hash: 'hash1' } }],
        next_page_offset: null,
      });

      const result = await service.getExistingTextHashes();

      expect(result.get('uuid-1')).toBe('hash1');
    });

    it('paginates until next_page_offset is null', async () => {
      mockClient.scroll
        .mockResolvedValueOnce({
          points: [{ id: 'uuid-1', payload: { text_hash: 'hash1' } }],
          next_page_offset: 250,
        })
        .mockResolvedValueOnce({
          points: [{ id: 'uuid-2', payload: { text_hash: 'hash2' } }],
          next_page_offset: null,
        });

      const result = await service.getExistingTextHashes();

      expect(mockClient.scroll).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(2);
      expect(result.get('uuid-2')).toBe('hash2');
    });

    it('stops pagination when next_page_offset is undefined', async () => {
      mockClient.scroll.mockResolvedValue({
        points: [],
        next_page_offset: undefined,
      });

      await service.getExistingTextHashes();

      expect(mockClient.scroll).toHaveBeenCalledTimes(1);
    });

    it('ignores points whose id or text_hash is not a string', async () => {
      mockClient.scroll.mockResolvedValue({
        points: [
          { id: 1, payload: { text_hash: 'hash1' } },
          { id: 'uuid-2', payload: { text_hash: 42 } },
        ],
        next_page_offset: null,
      });

      const result = await service.getExistingTextHashes();

      expect(result.size).toBe(0);
    });
  });

  describe('upsertPoints', () => {
    it('returns immediately without calling the client for an empty array', async () => {
      await service.upsertPoints([]);
      expect(mockClient.upsert).not.toHaveBeenCalled();
    });

    it('calls client.upsert with transformed points', async () => {
      mockClient.upsert.mockResolvedValue(undefined);
      const point = makePoint();

      await service.upsertPoints([point]);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          wait: true,
          points: [expect.objectContaining({ id: point.id, vector: point.vector })],
        }),
      );
    });

    it('throws immediately when upsert fails with a non-transient error', async () => {
      mockClient.upsert.mockRejectedValue(new Error('bad request'));

      await expect(service.upsertPoints([makePoint()])).rejects.toThrow('bad request');
    });
  });
});
