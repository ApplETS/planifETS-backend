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
        '**/*.(t|j)s',
        '!dist/**',
        '!test/**',
        '!coverage/**',
        '!src/**/dto/*.ts',
        '!./.eslintrc.js',
    ],
    coverageDirectory: './coverage',
    testEnvironment: 'node',
    coverageProvider: 'v8',
};
