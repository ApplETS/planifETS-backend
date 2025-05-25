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
  ) {}

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
  public async getAllCourses() {
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
    programCode?: string,
    limit = 20,
    offset = 0,
  ): Promise<SearchCoursesDto> {
    const { courses: raw, total } = await this.courseRepository.searchCourses(
      query,
      programCode,
      limit,
      offset,
    );

    const courses: SearchCourseResult[] = raw.map((c) =>
      CourseMapper.toSearchDto(c, programCode),
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
    this.logger.verbose('upsertCourses');

    const existingCourses = await this.getCoursesByIds(
      data.map((course) => course.id),
    );
    const operations = this.prepareUpsertCourses(data, existingCourses);

    return Promise.all([...operations.updates, ...operations.creations]);
  }

  private prepareUpsertCourses(
    data: Prisma.CourseCreateInput[],
    existingCourses: Map<number, Course>,
  ): {
    updates: Array<Promise<Course>>;
    creations: Array<Promise<Course>>;
  } {
    const updates: Array<Promise<Course>> = [];
    const creations: Array<Promise<Course>> = [];

    data.forEach((courseData) => {
      const existingCourse = existingCourses.get(courseData.id);

      if (existingCourse) {
        const hasChanges = this.hasCourseChanged(existingCourse, courseData);
        if (hasChanges) {
          updates.push(
            this.updateCourse({
              where: { id: courseData.id },
              data: courseData,
            }),
          );
        } else {
          updates.push(Promise.resolve(existingCourse));
        }
      } else {
        creations.push(this.createCourse(courseData));
      }
    });

    return { updates, creations };
  }

  private hasCourseChanged(
    existingCourse: Course,
    courseData: Prisma.CourseCreateInput,
  ): boolean {
    const normalizedExistingCourse = {
      id: existingCourse.id,
      code: existingCourse.code,
      title: existingCourse.title,
      description: existingCourse.description,
      credits: existingCourse.credits,
      cycle: existingCourse.cycle,
    };

    const normalizedCourseData = {
      id: courseData.id,
      code: courseData.code,
      title: courseData.title,
      description: courseData.description,
      credits: courseData.credits,
      cycle: courseData.cycle,
    };

    return (
      JSON.stringify(normalizedExistingCourse) !==
      JSON.stringify(normalizedCourseData)
    );
  }

  public async deleteCourse(
    where: Prisma.CourseWhereUniqueInput,
  ): Promise<Course> {
    this.logger.verbose('deleteCourse', where);

    return this.prisma.course.delete({
      where,
    });
  }
}
