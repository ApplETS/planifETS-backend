import { createHash } from 'node:crypto';

import { v5 as uuidv5 } from 'uuid';

import { EmbeddingViewDto } from './dtos/embedding-view.dto';

const QDRANT_ID_NAMESPACE =
  process.env.QDRANT_ID_NAMESPACE ?? '5e7f1c4d-3d8a-45f1-87a4-9cf4de6f6b29';

const TYPE_LABELS: Record<string, string> = {
  CONCE: 'cours optionnel',
  TRONC: 'tronc commun',
  PROFI: 'cours de profil',
};

export interface CourseEmbeddingPayload {
  embedding_id: string;
  course_id: number;
  program_id: number;
  code: string;
  title: string;
  description: string;
  cycle?: number;
  program_title: string;
  type?: string;
  type_label?: string;
  typical_session_index?: number;
  unstructured_prerequisite?: string;
  prerequisite_codes: string[];
  has_prerequisites: boolean;
  availability: string[];
  sessions: string[];
  text: string;
  text_hash: string;
  embedding_model: string;
  indexed_at: string;
}

export interface PreparedCourseEmbedding {
  id: string;
  text: string;
  payload: CourseEmbeddingPayload;
}

export function toQdrantPointId(embeddingId: string): string {
  return uuidv5(embeddingId, QDRANT_ID_NAMESPACE);
}

export function hashEmbeddingText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function getCourseTypeLabel(type: string | null | undefined): string | undefined {
  if (!type) return undefined;
  return TYPE_LABELS[type] ?? type;
}

export function buildCourseEmbeddingText(row: EmbeddingViewDto): string {
  const parts: string[] = [];

  parts.push(toSentence(`${row.code} — ${row.title}`));

  const description = clean(row.description);
  if (description) parts.push(toSentence(description));

  const prerequisiteCodes = cleanStringArray(row.prerequisite_codes);
  if (prerequisiteCodes.length > 0) {
    parts.push(`Préalables : ${prerequisiteCodes.join(', ')}.`);
  }

  const unstructuredPrerequisite = clean(row.unstructured_prerequisite);
  if (unstructuredPrerequisite) {
    parts.push(`Préalables non structurés : ${unstructuredPrerequisite}.`);
  }

  const typeLabel = getCourseTypeLabel(row.type);
  if (typeLabel) {
    parts.push(`Type : ${typeLabel}.`);
  }

  const programTitle = clean(row.program_title);
  if (programTitle) {
    parts.push(`Programme : ${programTitle}.`);
  }

  if (row.cycle !== null && row.cycle !== undefined) {
    parts.push(`Cycle : ${row.cycle}.`);
  }

  if (row.typical_session_index !== null && row.typical_session_index !== undefined) {
    parts.push(`Session typique : ${row.typical_session_index}.`);
  }

  const availability = cleanStringArray(row.availability);
  if (availability.length > 0) {
    parts.push(`Disponibilité : ${availability.join(', ')}.`);
  }

  const sessions = cleanStringArray(row.sessions);
  if (sessions.length > 0) {
    parts.push(`Sessions : ${sessions.join(', ')}.`);
  }

  return normalizeWhitespace(parts.join(' '));
}

export function buildCourseEmbeddingPayload(
  row: EmbeddingViewDto,
  text: string,
  embeddingModel: string,
  indexedAt = new Date().toISOString(),
): CourseEmbeddingPayload {
  const prerequisiteCodes = cleanStringArray(row.prerequisite_codes);
  const availability = cleanStringArray(row.availability);
  const sessions = cleanStringArray(row.sessions);
  const typeLabel = getCourseTypeLabel(row.type);

  const payload: CourseEmbeddingPayload = {
    embedding_id: row.embedding_id,
    course_id: row.course_id,
    program_id: row.program_id,
    code: row.code,
    title: row.title,
    description: row.description ?? '',
    program_title: row.program_title,
    prerequisite_codes: prerequisiteCodes,
    has_prerequisites: Boolean(row.has_prerequisites),
    availability,
    sessions,
    text,
    text_hash: hashEmbeddingText(text),
    embedding_model: embeddingModel,
    indexed_at: indexedAt,
  };

  if (row.cycle !== null && row.cycle !== undefined) {
    payload.cycle = row.cycle;
  }

  if (row.type) {
    payload.type = row.type;
  }

  if (typeLabel) {
    payload.type_label = typeLabel;
  }

  if (row.typical_session_index !== null && row.typical_session_index !== undefined) {
    payload.typical_session_index = row.typical_session_index;
  }

  const unstructuredPrerequisite = clean(row.unstructured_prerequisite);
  if (unstructuredPrerequisite) {
    payload.unstructured_prerequisite = unstructuredPrerequisite;
  }

  return payload;
}

export function prepareCourseEmbedding(
  row: EmbeddingViewDto,
  embeddingModel: string,
): PreparedCourseEmbedding {
  const text = buildCourseEmbeddingText(row);

  return {
    id: toQdrantPointId(row.embedding_id),
    text,
    payload: buildCourseEmbeddingPayload(row, text, embeddingModel),
  };
}

export function computeCourseChangeKey(row: EmbeddingViewDto): { id: string; hash: string } {
  const text = buildCourseEmbeddingText(row);
  return { id: toQdrantPointId(row.embedding_id), hash: hashEmbeddingText(text) };
}

function clean(value: string | null | undefined): string {
  return normalizeWhitespace(value ?? '').trim();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toSentence(value: string): string {
  const text = clean(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function cleanStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => clean(value))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, 'fr-CA'));
}
