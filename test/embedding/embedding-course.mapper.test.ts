import { createHash } from 'node:crypto';

import { EmbeddingViewDto } from '../../src/embedding/dtos/embedding-view.dto';
import {
  buildCourseEmbeddingPayload,
  buildCourseEmbeddingText,
  computeCourseChangeKey,
  getCourseTypeLabel,
  hashEmbeddingText,
  prepareCourseEmbedding,
  toQdrantPointId,
} from '../../src/embedding/embedding-course.mapper';

const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const buildRow = (overrides: Partial<EmbeddingViewDto> = {}): EmbeddingViewDto => ({
  embedding_id: '352507_182848',
  course_id: 352507,
  program_id: 182848,
  code: 'LOG635',
  title: 'Systèmes intelligents',
  description: 'Ce cours vise la compréhension.',
  cycle: 1,
  program_title: 'Génie logiciel',
  type: 'TRONC',
  typical_session_index: 5,
  unstructured_prerequisite: null,
  prerequisite_codes: ['LOG320', 'MAT350'],
  has_prerequisites: true,
  availability: ['JOUR'],
  sessions: ['Automne 2026'],
  ...overrides,
});

describe('hashEmbeddingText', () => {
  it('produces a 64-char hex string', () => {
    const result = hashEmbeddingText('hello');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashEmbeddingText('test')).toBe(hashEmbeddingText('test'));
  });

  it('differs for different inputs', () => {
    expect(hashEmbeddingText('a')).not.toBe(hashEmbeddingText('b'));
  });

  it('matches Node crypto sha256', () => {
    const expected = createHash('sha256').update('hello').digest('hex');
    expect(hashEmbeddingText('hello')).toBe(expected);
  });
});

describe('toQdrantPointId', () => {
  it('returns a UUID v5 string', () => {
    expect(toQdrantPointId('352507_182848')).toMatch(UUID_V5_REGEX);
  });

  it('is deterministic for the same input', () => {
    expect(toQdrantPointId('352507_182848')).toBe(toQdrantPointId('352507_182848'));
  });

  it('produces different IDs for different embedding IDs', () => {
    expect(toQdrantPointId('352507_182848')).not.toBe(toQdrantPointId('352508_182848'));
  });

  it('produces a different id when QDRANT_ID_NAMESPACE changes', async () => {
    const defaultId = toQdrantPointId('352507_182848');

    jest.resetModules();
    process.env.QDRANT_ID_NAMESPACE = '11111111-1111-1111-1111-111111111111';
    const { toQdrantPointId: altFn } = await import('../../src/embedding/embedding-course.mapper');
    delete process.env.QDRANT_ID_NAMESPACE;
    jest.resetModules();

    expect(altFn('352507_182848')).toMatch(UUID_V5_REGEX);
    expect(altFn('352507_182848')).not.toBe(defaultId);
  });
});

describe('getCourseTypeLabel', () => {
  it('returns French label for CONCE', () => {
    expect(getCourseTypeLabel('CONCE')).toBe('cours optionnel');
  });

  it('returns French label for TRONC', () => {
    expect(getCourseTypeLabel('TRONC')).toBe('tronc commun');
  });

  it('returns French label for PROFI', () => {
    expect(getCourseTypeLabel('PROFI')).toBe('cours de profil');
  });

  it('returns the raw value for unknown types', () => {
    expect(getCourseTypeLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('returns undefined for null', () => {
    expect(getCourseTypeLabel(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(getCourseTypeLabel(undefined)).toBeUndefined();
  });
});

describe('buildCourseEmbeddingText', () => {
  it('includes code and title', () => {
    const text = buildCourseEmbeddingText(buildRow());
    expect(text).toContain('LOG635');
    expect(text).toContain('Systèmes intelligents');
  });

  it('includes description when present', () => {
    const text = buildCourseEmbeddingText(buildRow({ description: 'Une description.' }));
    expect(text).toContain('Une description.');
  });

  it('includes prerequisite codes sorted', () => {
    const text = buildCourseEmbeddingText(buildRow({ prerequisite_codes: ['MAT350', 'LOG320'] }));
    expect(text).toContain('Préalables : LOG320, MAT350.');
  });

  it('deduplicates prerequisite codes', () => {
    const text = buildCourseEmbeddingText(buildRow({ prerequisite_codes: ['LOG320', 'LOG320'] }));
    const count = (text.match(/LOG320/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('omits prerequisite section when array is empty', () => {
    const text = buildCourseEmbeddingText(buildRow({ prerequisite_codes: [] }));
    expect(text).not.toContain('Préalables :');
  });

  it('includes unstructured prerequisite when present', () => {
    const text = buildCourseEmbeddingText(buildRow({ unstructured_prerequisite: 'Approbation du directeur.' }));
    expect(text).toContain('Préalables non structurés : Approbation du directeur.');
  });

  it('omits unstructured prerequisite when null', () => {
    const text = buildCourseEmbeddingText(buildRow({ unstructured_prerequisite: null }));
    expect(text).not.toContain('Préalables non structurés');
  });

  it('includes type label for known types', () => {
    const text = buildCourseEmbeddingText(buildRow({ type: 'TRONC' }));
    expect(text).toContain('Type : tronc commun.');
  });

  it('omits type when null', () => {
    const text = buildCourseEmbeddingText(buildRow({ type: null }));
    expect(text).not.toContain('Type :');
  });

  it('includes program title when present', () => {
    const text = buildCourseEmbeddingText(buildRow({ program_title: 'Génie logiciel' }));
    expect(text).toContain('Programme : Génie logiciel.');
  });

  it('includes cycle when present', () => {
    const text = buildCourseEmbeddingText(buildRow({ cycle: 2 }));
    expect(text).toContain('Cycle : 2.');
  });

  it('omits cycle when null', () => {
    const text = buildCourseEmbeddingText(buildRow({ cycle: null }));
    expect(text).not.toContain('Cycle :');
  });

  it('includes typical_session_index when present', () => {
    const text = buildCourseEmbeddingText(buildRow({ typical_session_index: 5 }));
    expect(text).toContain('Session typique : 5.');
  });

  it('omits typical_session_index when null', () => {
    const text = buildCourseEmbeddingText(buildRow({ typical_session_index: null }));
    expect(text).not.toContain('Session typique :');
  });

  it('includes availability when present', () => {
    const text = buildCourseEmbeddingText(buildRow({ availability: ['JOUR', 'SOIR'] }));
    expect(text).toContain('Disponibilité :');
    expect(text).toContain('JOUR');
    expect(text).toContain('SOIR');
  });

  it('omits availability when empty', () => {
    const text = buildCourseEmbeddingText(buildRow({ availability: [] }));
    expect(text).not.toContain('Disponibilité :');
  });

  it('includes sessions when present', () => {
    const text = buildCourseEmbeddingText(buildRow({ sessions: ['Automne 2026'] }));
    expect(text).toContain('Sessions : Automne 2026.');
  });

  it('omits sessions when empty', () => {
    const text = buildCourseEmbeddingText(buildRow({ sessions: [] }));
    expect(text).not.toContain('Sessions :');
  });

  it('collapses extra whitespace', () => {
    const text = buildCourseEmbeddingText(buildRow({ description: 'a   b' }));
    expect(text).not.toMatch(/\s{2,}/);
  });

  it('filters non-string entries in array fields', () => {
    const text = buildCourseEmbeddingText(buildRow({ prerequisite_codes: [null, 'LOG320'] as unknown as string[] }));
    expect(text).toContain('LOG320');
    expect(text).not.toContain('null');
  });
});

describe('buildCourseEmbeddingPayload', () => {
  it('includes all required fields', () => {
    const text = 'embedded text';
    const payload = buildCourseEmbeddingPayload(buildRow(), text, 'Xenova/bge-m3', '2025-01-01T00:00:00.000Z');

    expect(payload.embedding_id).toBe('352507_182848');
    expect(payload.course_id).toBe(352507);
    expect(payload.program_id).toBe(182848);
    expect(payload.code).toBe('LOG635');
    expect(payload.title).toBe('Systèmes intelligents');
    expect(payload.text).toBe(text);
    expect(payload.text_hash).toBe(hashEmbeddingText(text));
    expect(payload.embedding_model).toBe('Xenova/bge-m3');
    expect(payload.indexed_at).toBe('2025-01-01T00:00:00.000Z');
  });

  it('includes cycle when present', () => {
    const payload = buildCourseEmbeddingPayload(buildRow({ cycle: 1 }), 'text', 'model', 'now');
    expect(payload.cycle).toBe(1);
  });

  it('omits cycle when null', () => {
    const payload = buildCourseEmbeddingPayload(buildRow({ cycle: null }), 'text', 'model', 'now');
    expect(payload).not.toHaveProperty('cycle');
  });

  it('includes type and type_label for known types', () => {
    const payload = buildCourseEmbeddingPayload(buildRow({ type: 'CONCE' }), 'text', 'model', 'now');
    expect(payload.type).toBe('CONCE');
    expect(payload.type_label).toBe('cours optionnel');
  });

  it('omits type fields when null', () => {
    const payload = buildCourseEmbeddingPayload(buildRow({ type: null }), 'text', 'model', 'now');
    expect(payload).not.toHaveProperty('type');
    expect(payload).not.toHaveProperty('type_label');
  });

  it('includes typical_session_index when present', () => {
    const payload = buildCourseEmbeddingPayload(buildRow({ typical_session_index: 3 }), 'text', 'model', 'now');
    expect(payload.typical_session_index).toBe(3);
  });

  it('omits typical_session_index when null', () => {
    const payload = buildCourseEmbeddingPayload(buildRow({ typical_session_index: null }), 'text', 'model', 'now');
    expect(payload).not.toHaveProperty('typical_session_index');
  });

  it('includes unstructured_prerequisite when present', () => {
    const payload = buildCourseEmbeddingPayload(
      buildRow({ unstructured_prerequisite: 'Approbation.' }),
      'text', 'model', 'now',
    );
    expect(payload.unstructured_prerequisite).toBe('Approbation.');
  });

  it('omits unstructured_prerequisite when null', () => {
    const payload = buildCourseEmbeddingPayload(buildRow({ unstructured_prerequisite: null }), 'text', 'model', 'now');
    expect(payload).not.toHaveProperty('unstructured_prerequisite');
  });

  it('defaults description to empty string when null/undefined', () => {
    const payload = buildCourseEmbeddingPayload(
      buildRow({ description: null as unknown as string }),
      'text', 'model', 'now',
    );
    expect(payload.description).toBe('');
  });

  it('uses current time as indexed_at when not provided', () => {
    const before = Date.now();
    const payload = buildCourseEmbeddingPayload(buildRow(), 'text', 'model');
    const after = Date.now();
    const indexedAtMs = new Date(payload.indexed_at).getTime();
    expect(indexedAtMs).toBeGreaterThanOrEqual(before);
    expect(indexedAtMs).toBeLessThanOrEqual(after);
  });

  it('has_prerequisites reflects the row value', () => {
    const truePayload = buildCourseEmbeddingPayload(buildRow({ has_prerequisites: true }), 'text', 'model', 'now');
    const falsePayload = buildCourseEmbeddingPayload(buildRow({ has_prerequisites: false }), 'text', 'model', 'now');
    expect(truePayload.has_prerequisites).toBe(true);
    expect(falsePayload.has_prerequisites).toBe(false);
  });
});

describe('prepareCourseEmbedding', () => {
  it('returns id, text, and payload', () => {
    const result = prepareCourseEmbedding(buildRow(), 'Xenova/bge-m3');
    expect(result.id).toMatch(UUID_V5_REGEX);
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.payload.code).toBe('LOG635');
  });

  it('payload.text matches result.text', () => {
    const result = prepareCourseEmbedding(buildRow(), 'Xenova/bge-m3');
    expect(result.payload.text).toBe(result.text);
  });

  it('payload.text_hash is hash of result.text', () => {
    const result = prepareCourseEmbedding(buildRow(), 'Xenova/bge-m3');
    expect(result.payload.text_hash).toBe(hashEmbeddingText(result.text));
  });
});

describe('computeCourseChangeKey', () => {
  it('returns a UUID id and 64-char hash', () => {
    const { id, hash } = computeCourseChangeKey(buildRow());
    expect(id).toMatch(UUID_V5_REGEX);
    expect(hash).toHaveLength(64);
  });

  it('is deterministic for the same row', () => {
    const row = buildRow();
    expect(computeCourseChangeKey(row)).toStrictEqual(computeCourseChangeKey(row));
  });

  it('produces a different hash when title changes', () => {
    const r1 = computeCourseChangeKey(buildRow({ title: 'Titre A' }));
    const r2 = computeCourseChangeKey(buildRow({ title: 'Titre B' }));
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('produces the same id for the same embedding_id regardless of other fields', () => {
    const r1 = computeCourseChangeKey(buildRow({ title: 'A' }));
    const r2 = computeCourseChangeKey(buildRow({ title: 'B' }));
    expect(r1.id).toBe(r2.id);
  });
});
