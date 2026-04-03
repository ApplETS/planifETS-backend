import { Course, Prisma, Program, Session } from '@prisma/client';

type JsonLike = string | number | boolean | null | JsonLike[] | {
  [key: string]: JsonLike;
};

function normalizeJsonContractValue(value: unknown): JsonLike {
  if (
    value === null
    || value === Prisma.JsonNull
    || value === Prisma.DbNull
    || value === Prisma.AnyNull
  ) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonContractValue(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeJsonContractValue(item),
      ]),
    );
  }

  return value as JsonLike;
}

interface SearchCourseContractInput {
  id: number;
  code: string;
  title: string;
  credits: number | null;
  cycle: number | null;
  sessionAvailability: {
    sessionCode: string;
    availability: string[];
  }[];
  prerequisites: {
    id: number;
    code: string;
    title: string;
    credits: number | null;
    cycle: number | null;
  }[];
  typicalSessionIndex?: number | null;
  type?: string | null;
  unstructuredPrerequisite?: string | null;
}

interface SearchCourseContract {
  id: number;
  code: string;
  title: string;
  credits: number | null;
  cycle: number | null;
  sessionAvailability: {
    sessionCode: string;
    availability: string[];
  }[];
  prerequisites: {
    id: number;
    code: string;
    title: string;
    credits: number | null;
    cycle: number | null;
  }[];
  typicalSessionIndex?: number | null;
  type?: string | null;
  unstructuredPrerequisite?: string | null;
}

interface SessionContract {
  year: number;
  trimester: Session['trimester'];
  createdAt: string;
  updatedAt: string;
}

interface CourseEntityContract {
  id: number;
  code: string;
  title: string;
  description: string;
  credits: number | null;
  cycle: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ProgramContract {
  id: number;
  code: string | null;
  title: string;
  credits: string | null;
  cycle: number;
  url: string;
  isHorairePdfParsable: boolean;
  isPlanificationPdfParsable: boolean;
  horaireCoursPdfJson: JsonLike;
  planificationPdfJson: JsonLike;
  createdAt: string;
  updatedAt: string;
}

export function buildSearchCourseContract(
  input: SearchCourseContractInput,
): SearchCourseContract {
  const {
    id,
    code,
    title,
    credits,
    cycle,
    sessionAvailability,
    prerequisites,
    typicalSessionIndex,
    type,
    unstructuredPrerequisite,
  } = input;

  return {
    id,
    code,
    title,
    credits,
    cycle,
    sessionAvailability,
    prerequisites,
    ...(Object.prototype.hasOwnProperty.call(input, 'typicalSessionIndex')
      ? {
        typicalSessionIndex,
        type,
        unstructuredPrerequisite,
      }
      : {}),
  };
}

export function serializeSessionContract(
  session: Pick<Session, 'year' | 'trimester' | 'createdAt' | 'updatedAt'>,
): SessionContract {
  return {
    year: session.year,
    trimester: session.trimester,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function serializeCourseEntityContract(
  course: Pick<
    Course,
    | 'id'
    | 'code'
    | 'title'
    | 'description'
    | 'credits'
    | 'cycle'
    | 'createdAt'
    | 'updatedAt'
  >,
): CourseEntityContract {
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description,
    credits: course.credits,
    cycle: course.cycle,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

export function serializeProgramContract(
  program: Pick<
    Program,
    | 'id'
    | 'code'
    | 'title'
    | 'credits'
    | 'cycle'
    | 'url'
    | 'isHorairePdfParsable'
    | 'isPlanificationPdfParsable'
    | 'horaireCoursPdfJson'
    | 'planificationPdfJson'
    | 'createdAt'
    | 'updatedAt'
  >,
): ProgramContract {
  return {
    id: program.id,
    code: program.code,
    title: program.title,
    credits: program.credits,
    cycle: program.cycle,
    url: program.url,
    isHorairePdfParsable: program.isHorairePdfParsable,
    isPlanificationPdfParsable: program.isPlanificationPdfParsable,
    horaireCoursPdfJson: normalizeJsonContractValue(program.horaireCoursPdfJson),
    planificationPdfJson: normalizeJsonContractValue(program.planificationPdfJson),
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}
