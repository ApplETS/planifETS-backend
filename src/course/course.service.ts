import { Injectable, Logger } from '@nestjs/common';
import { Course, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CourseMapper } from './course.mapper';
import { CourseRepository } from './course.repository';
import { SearchCourseResult, SearchCoursesDto } from './dtos/search-course.dto';

@Injectable()
export class CourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseRepository: CourseRepository,
  ) { }

  private readonly logger = new Logger(CourseService.name);

  public async getCourse(
    courseWhereUniqueInput: Prisma.CourseWhereUniqueInput,
  ): Promise<Course | null> {
    const course = await this.prisma.course.findUnique({
      where: courseWhereUniqueInput,
    });

    return course;
  }

  public async getCourseByCode(code: string): Promise<Course | null> {
    const course = await this.prisma.course.findFirst({
      where: { code },
    });

    return course;
  }

  private async getCoursesByIds(
    courseIds: number[],
  ): Promise<Map<number, Course>> {
    const existingCourses = await this.prisma.course.findMany({
      where: { id: { in: courseIds } },
    });

    return new Map(existingCourses.map((course) => [course.id, course]));
  }

  public async getCoursesByCodes(codes: string[]): Promise<Course[]> {
    this.logger.verbose('getCoursesByCodes', codes);

    return this.prisma.course.findMany({
      where: {
        code: {
          in: codes,
        },
      },
    });
  }
  public async getAllCourses(): Promise<Course[]> {
    this.logger.verbose('getAllCourses');

    return this.prisma.course.findMany();
  }

  public async getCoursesByProgram(programId: number): Promise<Course[]> {
    this.logger.verbose('getCoursesByProgram', programId);

    return this.prisma.course.findMany({
      where: {
        programs: {
          some: {
            programId,
          },
        },
      },
    });
  }

  public async searchCourses(
    query: string,
    programCodes?: string[],
    limit = 20,
    offset = 0,
  ): Promise<SearchCoursesDto> {
    // Validate program codes if they exist
    let validProgramCodes: string[] | undefined = undefined;

    if (programCodes && programCodes.length > 0) {
      // Filter out invalid program codes
      const existingPrograms = await this.prisma.program.findMany({
        where: { code: { in: programCodes } },
        select: { code: true },
      });

      validProgramCodes = existingPrograms
        .map((p) => p.code)
        .filter((code): code is string => code !== null);

      const invalidProgramCodes = programCodes.filter(
        (code) => !validProgramCodes?.includes(code),
      );

      if (invalidProgramCodes.length > 0) {
        this.logger.error(
          `Invalid program codes provided for course search: ${invalidProgramCodes.join(
            ', ',
          )}`,
          { invalidProgramCodes, query },
        );
      }

      // If all program codes are invalid, perform a search without program filtering
      if (validProgramCodes.length === 0) {
        validProgramCodes = undefined;
        this.logger.warn(
          'All provided program codes were invalid. Performing search without program filtering.',
          { query, providedProgramCodes: programCodes },
        );
      }
    }

    const { courses: raw, total } = await this.courseRepository.searchCourses(
      query,
      validProgramCodes,
      limit,
      offset,
    );

    const courses: SearchCourseResult[] = raw.map((c) =>
      CourseMapper.toSearchDto(c, validProgramCodes),
    );

    return {
      courses,
      total,
      hasMore: offset + courses.length < total,
    };
  }

  public async createCourse(data: Prisma.CourseCreateInput): Promise<Course> {
    this.logger.verbose('Creating new course', data.code);

    return this.prisma.course.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });
  }

  public async updateCourse(params: {
    where: Prisma.CourseWhereUniqueInput;
    data: Prisma.CourseUpdateInput;
  }): Promise<Course> {
    const { data, where } = params;

    this.logger.verbose('Updating course', data.code);
    return this.prisma.course.update({
      data: {
        ...data,
        updatedAt: new Date(),
      },
      where,
    });
  }

  public async upsertCourses(
    data: Prisma.CourseCreateInput[],
  ): Promise<Course[]> {
    const results: Course[] = [];
    for (const courseData of data) {
      const result = await this.prisma.course.upsert({
        where: { code: courseData.code },
        update: courseData,
        create: courseData,
      });
      results.push(result);
    }
    return results;
  }
}
