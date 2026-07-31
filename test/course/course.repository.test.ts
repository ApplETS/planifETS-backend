import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CourseRepository } from '../../src/course/course.repository';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('CourseRepository', () => {
  let repository: CourseRepository;
  const prisma = {
    $queryRaw: jest.fn(),
    course: { findMany: jest.fn() }
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CourseRepository,
        { provide: PrismaService, useValue: prisma }
      ]
    }).compile();

    repository = module.get(CourseRepository);
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
  });

  it('hydrates accent-insensitive matches in ranked query order', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 2 }, { id: 1 }])
      .mockResolvedValueOnce([{ count: 2n }]);
    prisma.course.findMany.mockResolvedValueOnce([
      { id: 1, code: 'A', title: 'École' },
      { id: 2, code: 'B', title: 'Maîtrise' }
    ]);

    const result = await repository.searchCourses('maitrise', undefined, 20, 0);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [2, 1] } } })
    );
    expect(result.courses.map(({ id }) => id)).toEqual([2, 1]);
    expect(result.total).toBe(2);
  });

  it('passes program codes, pagination, and literal search text as query parameters', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 0n }]);
    prisma.course.findMany.mockResolvedValueOnce([]);

    await repository.searchCourses('Ecole', ['7084'], 10, 5);

    const searchQuery = JSON.stringify(prisma.$queryRaw.mock.calls[0]);
    expect(searchQuery).toContain('Ecole');
    expect(searchQuery).toContain('7084');
    expect(prisma.$queryRaw.mock.calls[0][0].values).toEqual(
      expect.arrayContaining([10, 5])
    );
  });
});
