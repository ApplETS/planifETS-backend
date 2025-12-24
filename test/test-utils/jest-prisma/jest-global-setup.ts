import { assertIsTestDatabase } from './assert-test-db';
import { loadTestEnv } from './load-env';
import { runCommand } from './run-command';

export default async function globalSetup(): Promise<void> {
  loadTestEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing in globalSetup');

  
  assertIsTestDatabase(databaseUrl);

  // Ensure schema is up-to-date for the test DB
  await runCommand('yarn', ['prisma:migrate-prod'], process.env);
  await runCommand('yarn', ['prisma:generate'], process.env);
}
