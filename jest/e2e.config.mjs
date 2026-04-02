import dbConfig from './db.config.mjs';

export default {
  ...dbConfig,
  testRegex: String.raw`test/.*\.e2e\.test\.ts$`,
  testPathIgnorePatterns: [],
};
