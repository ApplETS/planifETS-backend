import dbConfig from './db.config.mjs';

export default {
  ...dbConfig,
  testRegex: String.raw`test/.*\.e2e\.test\.ts$`,
  testPathIgnorePatterns: [],
  maxWorkers: 1, // E2E suites share one Postgres test database
};
