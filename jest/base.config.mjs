export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '..',
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest'],
  },
  moduleNameMapper: {
    '^@/common/(.*)$': '<rootDir>/src/common/$1',
    '^@/utils/(.*)$': '<rootDir>/src/common/utils/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.test.ts',
    '!src/**/*.integration.test.ts',
    '!src/**/*.e2e.test.ts',
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
  coverageDirectory: '<rootDir>/coverage',
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 80,
      lines: 70,
      statements: 70,
    },
  },
};
