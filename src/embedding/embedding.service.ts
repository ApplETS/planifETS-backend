import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingCountDto } from './dtos/embedding-count.dto';
import { EmbeddingViewDto } from './dtos/embedding-view.dto';

@Injectable()
export class EmbeddingService {
  constructor(private readonly prisma: PrismaService) {}

  public findAll(): Promise<EmbeddingViewDto[]> {
    return this.prisma.$queryRaw<EmbeddingViewDto[]>`
      SELECT * FROM "v_courses_for_embedding"
    `;
  }

  public findByCourseId(courseId: number): Promise<EmbeddingViewDto[]> {
    return this.prisma.$queryRaw<EmbeddingViewDto[]>`
      SELECT * FROM "v_courses_for_embedding"
      WHERE course_id = ${courseId}
      ORDER BY program_id
    `;
  }

  public async countCourses(): Promise<EmbeddingCountDto> {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT course_id) as count FROM "v_courses_for_embedding"
    `;
    return { count: Number(result[0].count) };
  }
}
