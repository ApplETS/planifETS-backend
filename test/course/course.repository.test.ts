import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CourseRepository } from '../../src/course/course.repository';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseRepository', () => {
  let repository: CourseRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseRepository,
        {
          provide: PrismaService,
          useValue: {
            course: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();
    repository = module.get<CourseRepository>(CourseRepository);
    prisma = module.get(PrismaService);
    // Cast to jest.Mock to allow mockResolvedValueOnce
    (prisma.course.findMany as jest.Mock).mockClear();
    (prisma.course.count as jest.Mock).mockClear();
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchCourses', () => {
    it('should return codeStartsMatches only if enough results', async () => {
      (prisma.course.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 } as { id: number }]);
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      const result = await repository.searchCourses('ABC', ['P1'], 1, 0);
      expect(prisma.course.findMany).toHaveBeenCalledTimes(1);
      expect(result.courses).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should not add program filter if programCodes is undefined', async () => {
      (prisma.course.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('ABC', undefined, 1, 0);
      const callArgs = (prisma.course.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.programs).toBeUndefined();
    });

    it('should not add program filter if programCodes is empty', async () => {
      (prisma.course.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('ABC', [], 1, 0);
      const callArgs = (prisma.course.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.programs).toBeUndefined();
    });

    it('should add program filter if programCodes is non-empty', async () => {
      (prisma.course.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('ABC', ['P1', 'P2'], 1, 0);
      const callArgs = (prisma.course.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.programs).toBeDefined();
      expect(callArgs.where.programs.some.program.code.in).toEqual(['P1', 'P2']);
    });

    it('should call codeContainsMatches if codeStartsMatches is not enough', async () => {
      (prisma.course.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // codeStartsMatches
        .mockResolvedValueOnce([{ id: 2 } as { id: number }]) // codeContainsMatches
        .mockResolvedValueOnce([]); // titleContainsMatches
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      const result = await repository.searchCourses('DEF', ['P2'], 1, 0);
      expect(prisma.course.findMany).toHaveBeenCalledTimes(2);
      expect(result.courses[0].id).toBe(2);
    });

    it('should add program filter in codeContainsMatches', async () => {
      (prisma.course.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // codeStartsMatches
        .mockResolvedValueOnce([{ id: 2 }]) // codeContainsMatches
        .mockResolvedValueOnce([]); // titleContainsMatches
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('DEF', ['P2'], 1, 0);
      const callArgs = (prisma.course.findMany as jest.Mock).mock.calls[1][0];
      expect(callArgs.where.programs).toBeDefined();
      expect(callArgs.where.programs.some.program.code.in).toEqual(['P2']);
    });

    it('should not add program filter in codeContainsMatches if programCodes is undefined', async () => {
      (prisma.course.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // codeStartsMatches
        .mockResolvedValueOnce([{ id: 2 }]) // codeContainsMatches
        .mockResolvedValueOnce([]); // titleContainsMatches
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('DEF', undefined, 1, 0);
      const callArgs = (prisma.course.findMany as jest.Mock).mock.calls[1][0];
      expect(callArgs.where.programs).toBeUndefined();
    });

    it('should call titleContainsMatches if still not enough', async () => {
      (prisma.course.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // codeStartsMatches
        .mockResolvedValueOnce([]) // codeContainsMatches
        .mockResolvedValueOnce([{ id: 3 } as { id: number }]); // titleContainsMatches
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      const result = await repository.searchCourses('GHI', ['P3'], 1, 0);
      expect(prisma.course.findMany).toHaveBeenCalledTimes(3);
      expect(result.courses[0].id).toBe(3);
    });

    it('should add program filter in titleContainsMatches', async () => {
      (prisma.course.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // codeStartsMatches
        .mockResolvedValueOnce([]) // codeContainsMatches
        .mockResolvedValueOnce([{ id: 3 }]); // titleContainsMatches
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('GHI', ['P3'], 1, 0);
      const callArgs = (prisma.course.findMany as jest.Mock).mock.calls[2][0];
      expect(callArgs.where.programs).toBeDefined();
      expect(callArgs.where.programs.some.program.code.in).toEqual(['P3']);
    });

    it('should not add program filter in titleContainsMatches if programCodes is undefined', async () => {
      (prisma.course.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // codeStartsMatches
        .mockResolvedValueOnce([]) // codeContainsMatches
        .mockResolvedValueOnce([{ id: 3 }]); // titleContainsMatches
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('GHI', undefined, 1, 0);
      const callArgs = (prisma.course.findMany as jest.Mock).mock.calls[2][0];
      expect(callArgs.where.programs).toBeUndefined();
    });

    it('should merge all results if needed', async () => {
      (prisma.course.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: 1 } as { id: number }]) // codeStartsMatches
        .mockResolvedValueOnce([{ id: 2 } as { id: number }]) // codeContainsMatches
        .mockResolvedValueOnce([{ id: 3 } as { id: number }]); // titleContainsMatches
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(3);
      const result = await repository.searchCourses('XYZ', ['P4'], 5, 0);
      expect(result.courses.map((c: { id: number }) => c.id)).toEqual([1, 2, 3]);
      expect(result.total).toBe(3);
    });

    it('should add program filter in count if programCodes is non-empty', async () => {
      (prisma.course.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('ABC', ['P1'], 1, 0);
      const callArgs = (prisma.course.count as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.programs).toBeDefined();
      expect(callArgs.where.programs.some.program.code.in).toEqual(['P1']);
    });

    it('should not add program filter in count if programCodes is undefined', async () => {
      (prisma.course.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      (prisma.course.count as jest.Mock).mockResolvedValueOnce(1);
      await repository.searchCourses('ABC', undefined, 1, 0);
      const callArgs = (prisma.course.count as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.programs).toBeUndefined();
    });
  });
});
