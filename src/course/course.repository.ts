import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CourseSearchResult } from './course.types';

const SEARCH_INCLUDE = {
  courseInstances: {
    include: { session: true },
    orderBy: [{ sessionYear: 'desc' }, { sessionTrimester: 'desc' }]
  },
  programs: {
    include: {
      prerequisites: {
        include: {
          prerequisite: { include: { course: true } }
        }
      }
    }
  }
} satisfies Prisma.CourseInclude;

const SEARCH_ORDER_BY = [
  { code: 'asc' },
  { title: 'asc' }
] satisfies Prisma.CourseOrderByWithRelationInput[];

function programCodesFilter(
  programCodes: string[] | undefined
): Prisma.CourseWhereInput {
  return programCodes && programCodes.length > 0
    ? { programs: { some: { program: { code: { in: programCodes } } } } }
    : {};
}

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(CourseRepository.name);

  private getCodeStartsMatches(
    query: string,
    programCodes: string[] | undefined,
    limit: number,
    offset: number
  ) {
    const where: Prisma.CourseWhereInput = {
      code: { startsWith: query, mode: 'insensitive' },
      ...programCodesFilter(programCodes)
    };
    return this.prisma.course.findMany({
      where,
      orderBy: SEARCH_ORDER_BY,
      include: SEARCH_INCLUDE,
      take: limit,
      skip: offset
    }) as Promise<CourseSearchResult[]>;
  }

  private getCodeContainsMatches(
    query: string,
    programCodes: string[] | undefined,
    take: number
  ) {
    const where: Prisma.CourseWhereInput = {
      code: {
        contains: query,
        mode: 'insensitive',
        not: { startsWith: query }
      },
      ...programCodesFilter(programCodes)
    };
    return this.prisma.course.findMany({
      where,
      orderBy: SEARCH_ORDER_BY,
      include: SEARCH_INCLUDE,
      take,
      skip: 0
    }) as Promise<CourseSearchResult[]>;
  }

  private getTitleContainsMatches(
    query: string,
    programCodes: string[] | undefined,
    take: number
  ) {
    const where: Prisma.CourseWhereInput = {
      title: { contains: query, mode: 'insensitive' },
      code: { not: { contains: query } },
      ...programCodesFilter(programCodes)
    };
    return this.prisma.course.findMany({
      where,
      orderBy: SEARCH_ORDER_BY,
      include: SEARCH_INCLUDE,
      take,
      skip: 0
    }) as Promise<CourseSearchResult[]>;
  }

  public async searchCourses(
    query: string,
    programCodes?: string[],
    limit = 20,
    offset = 0
  ): Promise<{ courses: CourseSearchResult[]; total: number }> {
    this.logger.verbose('searchCourses', {
      query,
      programCodes,
      limit,
      offset
    });

    const codeStartsMatches = await this.getCodeStartsMatches(
      query,
      programCodes,
      limit,
      offset
    );
    let courses = codeStartsMatches;
    const codeStartsCount = codeStartsMatches.length;

    if (codeStartsCount < limit) {
      const codeContainsMatches = await this.getCodeContainsMatches(
        query,
        programCodes,
        limit - codeStartsCount
      );
      courses = [...courses, ...codeContainsMatches];
    }

    if (courses.length < limit) {
      const titleContainsMatches = await this.getTitleContainsMatches(
        query,
        programCodes,
        limit - courses.length
      );
      courses = [...courses, ...titleContainsMatches];
    }

    const total = await this.prisma.course.count({
      where: {
        OR: [
          { code: { startsWith: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } }
        ],
        ...programCodesFilter(programCodes)
      }
    });

    this.logger.verbose(`Found ${courses.length} courses matching "${query}"`, {
      query,
      programCodes,
      limit,
      offset
    });
    return { courses, total };
  }
}
