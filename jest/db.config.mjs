import baseConfig from './base.config.mjs';

export default {
  ...baseConfig,
  testEnvironment: '@quramy/jest-prisma-node/environment',
  testEnvironmentOptions: {
    databaseUrl: process.env.DATABASE_URL,
  },
  globalSetup: '<rootDir>/test/test-utils/jest-prisma/jest-global-setup.ts',
  globalTeardown: '<rootDir>/test/test-utils/jest-prisma/jest-global-teardown.ts',
  setupFilesAfterEnv: [
    '<rootDir>/test/test-utils/jest-prisma/mock-jest-prisma-setup.ts',
  ],
};
