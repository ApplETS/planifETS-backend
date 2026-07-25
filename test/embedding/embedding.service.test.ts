import { EmbeddingViewDto } from '../../src/embedding/dtos/embedding-view.dto';
import { EmbeddingService } from '../../src/embedding/embedding.service';
import { buildCourseEmbeddingText } from '../../src/embedding/embedding-course.mapper';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let prismaMock: { $queryRaw: jest.Mock };

  beforeEach(() => {
    prismaMock = { $queryRaw: jest.fn() };
    service = new EmbeddingService(prismaMock as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns all rows from the embedding view', async () => {
      const rows: EmbeddingViewDto[] = [
        {
          embedding_id: '1_2',
          course_id: 1,
          title: 'Introduction to Software Engineering',
          description: 'Fundamentals of software development.',
          unstructured_prerequisite: null
        } as EmbeddingViewDto
      ];
      prismaMock.$queryRaw.mockResolvedValue(rows);
      await expect(service.findAll()).resolves.toStrictEqual(rows);
    });

    it('returns empty array when view is empty', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toStrictEqual([]);
    });
  });

  describe('findAllTexts', () => {
    const row = {
      embedding_id: '352539_182848',
      course_id: 352539,
      code: 'LOG680',
      title: "Introduction à l'approche DevOps",
      description: 'L’approche DevOps vise à intégrer le développement.',
      type: 'TRONC',
      prerequisite_codes: ['STA204'],
      unstructured_prerequisite: null
    } as unknown as EmbeddingViewDto;

    it('returns exactly the text the indexer embeds', async () => {
      prismaMock.$queryRaw.mockResolvedValue([row]);

      const [result] = await service.findAllTexts();

      expect(result.embedding_id).toBe('352539_182848');
      expect(result.text).toBe(buildCourseEmbeddingText(row));
    });

    it('returns empty array when view is empty', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);
      await expect(service.findAllTexts()).resolves.toStrictEqual([]);
    });
  });

  describe('findByCourseId', () => {
    it('returns rows for the given course ID', async () => {
      const rows: EmbeddingViewDto[] = [
        {
          embedding_id: '352507_182848',
          course_id: 352507,
          title: 'Systèmes intelligents et algorithmes',
          description:
            'Ce cours vise la compréhension des systèmes intelligents.',
          unstructured_prerequisite: null
        } as EmbeddingViewDto
      ];
      prismaMock.$queryRaw.mockResolvedValue(rows);
      await expect(service.findByCourseId(352507)).resolves.toStrictEqual(rows);
    });

    it('returns empty array when course is not found', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);
      await expect(service.findByCourseId(99999)).resolves.toStrictEqual([]);
    });
  });

  describe('countCourses', () => {
    it('converts bigint result to a plain number', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ count: BigInt(42) }]);
      await expect(service.countCourses()).resolves.toStrictEqual({
        count: 42
      });
    });

    it('returns zero when there are no courses', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);
      await expect(service.countCourses()).resolves.toStrictEqual({ count: 0 });
    });
  });
});
