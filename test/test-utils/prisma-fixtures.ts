import { Availability, Prisma, Trimester } from '@prisma/client';

import { PrismaService } from '../../src/prisma/prisma.service';

const DEFAULT_TIMESTAMP = new Date('2026-01-01T00:00:00.000Z');

interface SessionSeed {
  year: number;
  trimester: Trimester;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CourseSeed {
  id: number;
  code: string;
  title: string;
  description?: string;
  credits?: number | null;
  cycle?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProgramSeed {
  id: number;
  code?: string | null;
  title: string;
  credits?: string | null;
  cycle?: number;
  url?: string;
  isHorairePdfParsable?: boolean;
  isPlanificationPdfParsable?: boolean;
  horaireCoursPdfJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  planificationPdfJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProgramCourseSeed {
  courseId: number;
  programId: number;
  type?: string | null;
  typicalSessionIndex?: number | null;
  unstructuredPrerequisite?: string | null;
}

interface CourseInstanceSeed {
  courseId: number;
  sessionYear: number;
  sessionTrimester: Trimester;
  availability?: Availability[];
}

interface ProgramCoursePrerequisiteSeed {
  courseId: number;
  prerequisiteId: number;
  programId: number;
}

export async function seedSession(
  prisma: PrismaService,
  {
    year,
    trimester,
    createdAt = DEFAULT_TIMESTAMP,
    updatedAt = createdAt,
  }: SessionSeed,
) {
  return prisma.session.create({
    data: {
      year,
      trimester,
      createdAt,
      updatedAt,
    },
  });
}

export async function seedCourse(
  prisma: PrismaService,
  {
    id,
    code,
    title,
    description = `${code} description`,
    credits = 3,
    cycle = 1,
    createdAt = DEFAULT_TIMESTAMP,
    updatedAt = createdAt,
  }: CourseSeed,
) {
  return prisma.course.create({
    data: {
      id,
      code,
      title,
      description,
      credits,
      cycle,
      createdAt,
      updatedAt,
    },
  });
}

export async function seedProgram(
  prisma: PrismaService,
  {
    id,
    code = String(id),
    title,
    credits = '90',
    cycle = 1,
    url = `https://example.com/programs/${id}`,
    isHorairePdfParsable = false,
    isPlanificationPdfParsable = false,
    horaireCoursPdfJson = Prisma.JsonNull,
    planificationPdfJson = Prisma.JsonNull,
    createdAt = DEFAULT_TIMESTAMP,
    updatedAt = createdAt,
  }: ProgramSeed,
) {
  return prisma.program.create({
    data: {
      id,
      code,
      title,
      credits,
      cycle,
      url,
      isHorairePdfParsable,
      isPlanificationPdfParsable,
      horaireCoursPdfJson,
      planificationPdfJson,
      createdAt,
      updatedAt,
    },
  });
}

export async function seedProgramCourse(
  prisma: PrismaService,
  {
    courseId,
    programId,
    type = 'TRONC',
    typicalSessionIndex = 1,
    unstructuredPrerequisite = null,
  }: ProgramCourseSeed,
) {
  return prisma.programCourse.create({
    data: {
      courseId,
      programId,
      type,
      typicalSessionIndex,
      unstructuredPrerequisite,
    },
  });
}

export async function seedCourseInstance(
  prisma: PrismaService,
  {
    courseId,
    sessionYear,
    sessionTrimester,
    availability = [Availability.JOUR],
  }: CourseInstanceSeed,
) {
  return prisma.courseInstance.create({
    data: {
      courseId,
      sessionYear,
      sessionTrimester,
      availability,
    },
  });
}

export async function seedProgramCoursePrerequisite(
  prisma: PrismaService,
  { courseId, prerequisiteId, programId }: ProgramCoursePrerequisiteSeed,
) {
  return prisma.programCoursePrerequisite.create({
    data: {
      courseId,
      prerequisiteId,
      programId,
    },
  });
}
