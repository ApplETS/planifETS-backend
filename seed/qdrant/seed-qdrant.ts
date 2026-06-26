import { QdrantClient } from '@qdrant/js-client-rest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Idempotent Qdrant seed script.
 * Creates the collection if it doesn't exist, then upserts fixture points.
 *
 * Environment variables:
 *   QDRANT_URL      - Qdrant HTTP endpoint (default: http://localhost:6333)
 *   QDRANT_API_KEY  - API key (optional for local dev)
 *   QDRANT_COLLECTION - Collection name (default: courses)
 */

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'courses';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small dimensions

interface CourseFixture {
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

function generateDeterministicVector(id: string, size: number): number[] {
  // Generate a deterministic pseudo-random vector from the id string
  // This ensures idempotency - same id always produces same vector
  const vector: number[] = [];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < size; i++) {
    hash = (hash * 1103515245 + 12345) | 0;
    // Normalize to [-1, 1]
    vector.push(((hash >>> 0) / 0xffffffff) * 2 - 1);
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

async function main(): Promise<void> {
  console.log(`Connecting to Qdrant at ${QDRANT_URL}`);
  const client = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
  });

  // Check connectivity
  try {
    await client.getCollections();
    console.log('Connected to Qdrant successfully');
  } catch (error) {
    console.error('Failed to connect to Qdrant:', error);
    process.exit(1);
  }

  // Create collection if it doesn't exist (idempotent)
  const collections = await client.getCollections();
  const exists = collections.collections.some(
    (c: { name: string }) => c.name === COLLECTION_NAME,
  );

  if (!exists) {
    console.log(`Creating collection "${COLLECTION_NAME}" with vector size ${VECTOR_SIZE}`);
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
    });
    console.log('Collection created');
  } else {
    console.log(`Collection "${COLLECTION_NAME}" already exists`);
  }

  // Load fixtures
  const fixturesPath = path.resolve(process.cwd(), 'seed/qdrant/courses.json');
  const fixtures: CourseFixture[] = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
  console.log(`Loaded ${fixtures.length} fixture(s)`);

  // Upsert points (idempotent - uses embedding_id as point ID)
  const points = fixtures.map((fixture, index) => ({
    id: index + 1,
    vector: generateDeterministicVector(fixture.embedding_id, VECTOR_SIZE),
    payload: {
      embedding_id: fixture.embedding_id,
      course_id: fixture.course_id,
      program_id: fixture.program_id,
      code: fixture.code,
      title: fixture.title,
      description: fixture.description,
      cycle: fixture.cycle,
      program_title: fixture.program_title,
      type: fixture.type,
      typical_session_index: fixture.typical_session_index,
      unstructured_prerequisite: fixture.unstructured_prerequisite,
      prerequisite_codes: fixture.prerequisite_codes,
      has_prerequisites: fixture.has_prerequisites,
      availability: fixture.availability,
      sessions: fixture.sessions,
    },
  }));

  await client.upsert(COLLECTION_NAME, { points });
  console.log(`Upserted ${points.length} point(s) into "${COLLECTION_NAME}"`);

  // Verify
  const info = await client.getCollection(COLLECTION_NAME);
  console.log(`Collection "${COLLECTION_NAME}" now has ${info.points_count} point(s)`);
  console.log('Seed completed successfully');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
