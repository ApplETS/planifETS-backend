import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CourseSearchResult } from './course.types';

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(CourseRepository.name);

  public async searchCourses(
    query: string,
    programCodes?: string[],
    limit = 20,
    offset = 0,
  ): Promise<{ courses: CourseSearchResult[]; total: number }> {
    const where: Prisma.CourseWhereInput = {
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
      ],
      ...(programCodes && programCodes.length > 0
        ? { programs: { some: { program: { code: { in: programCodes } } } } }
        : {}),
    };

    this.logger.verbose('searchCourses', {
      query,
      programCodes,
      limit,
      offset,
    });

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { code: 'asc' },
        include: {
          courseInstances: {
            include: { session: true },
            orderBy: [{ sessionYear: 'desc' }, { sessionTrimester: 'desc' }],
          },
          programs:
            programCodes && programCodes.length > 0
              ? {
                  where: { program: { code: { in: programCodes } } },
                  include: {
                    prerequisites: {
                      include: {
                        prerequisite: { include: { course: true } },
                      },
                    },
                  },
                }
              : undefined,
        },
      }) as Promise<CourseSearchResult[]>,
      this.prisma.course.count({ where }),
    ]);

    this.logger.verbose(`Found ${courses.length} courses matching "${query}"`, {
      query,
      programCodes,
      limit,
      offset,
    });
    return { courses, total };
  }
}
