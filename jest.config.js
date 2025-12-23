/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testRegex: 'test/.*\\.(test|spec)\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': ['@swc/jest'],
    },
    moduleNameMapper: {
        '^@\/(.*)$': '<rootDir>/src/$1',
    },
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
    testEnvironment: 'node',
    coverageProvider: 'v8',
    coverageThreshold: {
        global: {
            lines: 50,
            statements: 50,
            branches: 50,
            functions: 50,
        },
    },
};
