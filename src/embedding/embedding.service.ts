import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface EmbeddingViewRow {
  embedding_id: string;
  course_id: number;
  program_id: number;
  code: string;
  title: string;
  description: string;
  cycle: number | null;
  program_title: string;
  type: string | null;
  typical_session_index: number | null;
  unstructured_prerequisite: string | null;
  prerequisite_codes: string[];
  has_prerequisites: boolean;
  availability: string[];
  sessions: string[];
}

@Injectable()
export class EmbeddingService {
  constructor(private readonly prisma: PrismaService) {}

  public findAll(): Promise<EmbeddingViewRow[]> {
    return this.prisma.$queryRaw<EmbeddingViewRow[]>`
      SELECT * FROM "v_courses_for_embedding"
    `;
  }

  public findByCourseId(courseId: number): Promise<EmbeddingViewRow[]> {
    return this.prisma.$queryRaw<EmbeddingViewRow[]>`
      SELECT * FROM "v_courses_for_embedding"
      WHERE course_id = ${courseId}
      ORDER BY program_id
    `;
  }
}
