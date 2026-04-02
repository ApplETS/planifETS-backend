import baseConfig from './base.config.mjs';

export default {
  ...baseConfig,
  testRegex: String.raw`test/.*\.test\.ts$`,
  testPathIgnorePatterns: [
    String.raw`\.integration\.test\.ts$`,
    String.raw`\.e2e\.test\.ts$`,
  ],
};
