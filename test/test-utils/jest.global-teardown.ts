import { assertIsTestDatabase } from './assert-test-db';
import { loadTestEnv } from './load-env';
import { resetDatabase } from './reset-db';

export default async function globalTeardown(): Promise<void> {
  loadTestEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing in globalTeardown');

  assertIsTestDatabase(databaseUrl);

  await resetDatabase(databaseUrl);
}
