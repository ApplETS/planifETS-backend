import { resolve } from 'node:path';

import { config } from 'dotenv';

export function loadTestEnv(): void {
  const envPath = resolve(process.cwd(), '.env.test');
  const result = config({ path: envPath, override: true });

  if (result.error) {
    throw result.error;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set after loading .env.test');
  }
}
