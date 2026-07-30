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

function programCodesFilter(programCodes: string[] | undefined): Prisma.Sql {
  return programCodes && programCodes.length > 0
    ? Prisma.sql`AND EXISTS (
        SELECT 1
        FROM "ProgramCourse" pc
        JOIN "Program" p ON p.id = pc."programId"
        WHERE pc."courseId" = c.id
          AND p.code IN (${Prisma.join(programCodes)})
      )`
    : Prisma.empty;
}

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(CourseRepository.name);

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

    const filter = programCodesFilter(programCodes);
    const matches = Prisma.sql`
      (
        POSITION(lower(${query}) IN lower(c.code)) > 0
        OR POSITION(lower(unaccent(${query})) IN lower(unaccent(c.title))) > 0
      )
      ${filter}
    `;
    const idsQuery = Prisma.sql`
      SELECT c.id
      FROM "Course" c
      WHERE ${matches}
      ORDER BY
        CASE
          WHEN POSITION(lower(${query}) IN lower(c.code)) = 1 THEN 0
          WHEN POSITION(lower(${query}) IN lower(c.code)) > 1 THEN 1
          ELSE 2
        END,
        c.code,
        c.title
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const countQuery = Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Course" c
      WHERE ${matches}
    `;
    const ids = await this.prisma.$queryRaw<{ id: number }[]>(idsQuery);
    const [{ count }] =
      await this.prisma.$queryRaw<{ count: bigint }[]>(countQuery);
    const rawCourses = (await this.prisma.course.findMany({
      where: { id: { in: ids.map(({ id }) => id) } },
      include: SEARCH_INCLUDE
    })) as CourseSearchResult[];
    const coursesById = new Map(
      rawCourses.map((course) => [course.id, course])
    );
    const courses = ids.flatMap(({ id }) => {
      const course = coursesById.get(id);
      return course ? [course] : [];
    });
    const total = Number(count);

    this.logger.verbose(`Found ${courses.length} courses matching "${query}"`, {
      query,
      programCodes,
      limit,
      offset
    });
    return { courses, total };
  }
}
