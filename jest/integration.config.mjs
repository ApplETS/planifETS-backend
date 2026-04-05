import dbConfig from './db.config.mjs';

export default {
  ...dbConfig,
  testRegex: String.raw`test/.*\.integration\.test\.ts$`,
  testPathIgnorePatterns: [],
  testTimeout: 30000,
};
