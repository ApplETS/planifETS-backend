import { pathsToModuleNameMapper } from 'ts-jest';

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: String.raw`test/.*\.(test|spec)\.ts$`,
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest'],
  },
  moduleNameMapper: pathsToModuleNameMapper({
    "@/common/*": ["./src/common/*"],
    "@/utils/*": ["./src/common/utils/*"]
  }, { prefix: '<rootDir>/' }),

  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/prisma/**',
    '!src/**/migrations/**',
    '!src/**/seeds/**',
    '!src/main.ts',
    '!src/instrument.ts',
    '!src/**/*.types.ts',
    '!src/**/types/**',
    '!src/**/dtos/**',
    '!src/**/*.dto.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/test/',
    '/coverage/',
  ],
  coverageDirectory: './coverage',
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      lines: 46,
      statements: 46,
      branches: 46,
      functions: 46,
    },
  },
  testEnvironment: "@quramy/jest-prisma-node/environment",
  testEnvironmentOptions: {
    databaseUrl: process.env.DATABASE_URL,
  },
  globalSetup: "<rootDir>/test/test-utils/jest-prisma/jest-global-setup.ts",
  globalTeardown: "<rootDir>/test/test-utils/jest-prisma/jest-global-teardown.ts",
  setupFilesAfterEnv: ['<rootDir>/test/test-utils/jest-prisma/mock-jest-prisma-setup.ts'],
};
